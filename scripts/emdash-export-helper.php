<?php
/**
 * Plugin Name: EmDash & SEO Migration Helper for WordPress
 * Plugin URI: https://github.com/alibakhtiari/emdash-seo
 * Description: Lightweight, secure exporter for migrating content, Kadence blocks, Rank Math / Yoast SEO metadata, and redirections to EmDash & Astro.
 * Version: 1.0.0
 * Author: EmDash SEO Contributors
 * License: MIT
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', function () {
    register_rest_route('emdash-export/v1', '/all', [
        'methods' => 'GET',
        'callback' => 'emdash_export_all_data',
        'permission_callback' => 'emdash_export_permission_check',
    ]);

    register_rest_route('emdash-export/v1', '/redirects', [
        'methods' => 'GET',
        'callback' => 'emdash_export_redirects',
        'permission_callback' => 'emdash_export_permission_check',
    ]);
});

/**
 * Permission check: requires manage_options or valid secret token
 */
function emdash_export_permission_check($request) {
    if (current_user_can('manage_options')) {
        return true;
    }

    $secret = $request->get_param('secret');
    $configured_secret = defined('EMDASH_EXPORT_SECRET') ? EMDASH_EXPORT_SECRET : get_option('emdash_export_secret');

    if (!empty($configured_secret) && !empty($secret) && hash_equals($configured_secret, $secret)) {
        return true;
    }

    return new WP_Error('rest_forbidden', 'Unauthorized. Must be logged in as admin or provide valid ?secret= token.', ['status' => 401]);
}

/**
 * Export all Rank Math & Redirection plugin redirections
 */
function emdash_export_redirects($request) {
    global $wpdb;
    $redirects = [];

    // 1. Rank Math Redirections table
    $rm_table = $wpdb->prefix . 'rank_math_redirections';
    if ($wpdb->get_var("SHOW TABLES LIKE '$rm_table'") == $rm_table) {
        $rows = $wpdb->get_results("SELECT id, sources, url_to, header_code, status FROM $rm_table WHERE status = 'active'", ARRAY_A);
        if ($rows) {
            foreach ($rows as $row) {
                $sources = maybe_unserialize($row['sources']);
                if (is_array($sources)) {
                    foreach ($sources as $source) {
                        $redirects[] = [
                            'id' => 'rm-' . $row['id'],
                            'pattern' => $source['pattern'] ?? '',
                            'comparison' => $source['comparison'] ?? 'exact',
                            'destination' => $row['url_to'],
                            'status_code' => intval($row['header_code'] ?: 301),
                            'source' => 'rank_math',
                        ];
                    }
                }
            }
        }
    }

    // 2. Redirection plugin (by John Godley) table if present
    $redirection_table = $wpdb->prefix . 'redirection_items';
    if ($wpdb->get_var("SHOW TABLES LIKE '$redirection_table'") == $redirection_table) {
        $rows = $wpdb->get_results("SELECT id, url, action_data, action_code, match_type, status FROM $redirection_table WHERE status = 'enabled'", ARRAY_A);
        if ($rows) {
            foreach ($rows as $row) {
                $redirects[] = [
                    'id' => 'redirection-' . $row['id'],
                    'pattern' => $row['url'],
                    'comparison' => ($row['match_type'] ?? '') === 'regex' ? 'regex' : 'exact',
                    'destination' => $row['action_data'],
                    'status_code' => intval($row['action_code'] ?: 301),
                    'source' => 'redirection_plugin',
                ];
            }
        }
    }

    return rest_ensure_response([
        'success' => true,
        'count' => count($redirects),
        'redirects' => $redirects,
    ]);
}

/**
 * Export complete posts, pages, SEO meta, and settings
 */
function emdash_export_all_data($request) {
    global $wpdb;

    // 1. Export Rank Math Redirections
    $redirects_response = emdash_export_redirects($request);
    $redirects = $redirects_response->get_data()['redirects'] ?? [];

    // 2. Export Rank Math Options
    $rm_general = get_option('rank-math-options-general', []);
    $rm_titles = get_option('rank-math-options-titles', []);

    // 3. Export Posts & Pages with Full Meta
    $post_types = ['post', 'page'];
    $items = [];

    foreach ($post_types as $pt) {
        $posts = get_posts([
            'post_type' => $pt,
            'posts_per_page' => -1,
            'post_status' => 'any',
        ]);

        foreach ($posts as $post) {
            $meta = get_post_meta($post->ID);
            $clean_meta = [];
            foreach ($meta as $k => $v) {
                // Keep Rank Math, Yoast, Kadence, and standard fields
                if (str_starts_with($k, 'rank_math_') || str_starts_with($k, '_yoast_') || str_starts_with($k, '_kad_') || $k === '_thumbnail_id') {
                    $val = $v[0];
                    $unserialized = maybe_unserialize($val);
                    $clean_meta[$k] = $unserialized;
                }
            }

            // Featured Image URL
            $thumb_id = get_post_thumbnail_id($post->ID);
            $thumb_url = $thumb_id ? wp_get_attachment_url($thumb_id) : null;

            // Categories & Tags
            $categories = wp_get_post_categories($post->ID, ['fields' => 'all']);
            $tags = wp_get_post_tags($post->ID, ['fields' => 'all']);

            $items[] = [
                'id' => $post->ID,
                'title' => $post->post_title,
                'slug' => $post->post_name,
                'post_type' => $post->post_type,
                'status' => $post->post_status,
                'date' => $post->post_date_gmt,
                'modified' => $post->post_modified_gmt,
                'content' => $post->post_content,
                'excerpt' => $post->post_excerpt,
                'permalink' => get_permalink($post->ID),
                'featured_image' => $thumb_url,
                'categories' => array_map(fn($c) => ['id' => $c->term_id, 'name' => $c->name, 'slug' => $c->slug], $categories),
                'tags' => array_map(fn($t) => ['id' => $t->term_id, 'name' => $t->name, 'slug' => $t->slug], $tags),
                'seo' => [
                    'title' => $clean_meta['rank_math_title'] ?? $clean_meta['_yoast_wpseo_title'] ?? '',
                    'description' => $clean_meta['rank_math_description'] ?? $clean_meta['_yoast_wpseo_metadesc'] ?? '',
                    'focus_keyword' => $clean_meta['rank_math_focus_keyword'] ?? $clean_meta['_yoast_wpseo_focuskw'] ?? '',
                    'canonical' => $clean_meta['rank_math_canonical_url'] ?? $clean_meta['_yoast_wpseo_canonical'] ?? '',
                    'robots' => $clean_meta['rank_math_robots'] ?? [],
                    'facebook_title' => $clean_meta['rank_math_facebook_title'] ?? '',
                    'facebook_description' => $clean_meta['rank_math_facebook_description'] ?? '',
                    'facebook_image' => $clean_meta['rank_math_facebook_image'] ?? '',
                    'twitter_title' => $clean_meta['rank_math_twitter_title'] ?? '',
                    'twitter_description' => $clean_meta['rank_math_twitter_description'] ?? '',
                    'twitter_image' => $clean_meta['rank_math_twitter_image'] ?? '',
                ],
                'raw_meta' => $clean_meta,
            ];
        }
    }

    return rest_ensure_response([
        'site' => [
            'name' => get_bloginfo('name'),
            'description' => get_bloginfo('description'),
            'url' => home_url(),
        ],
        'total_items' => count($items),
        'items' => $items,
        'redirects' => $redirects,
        'rank_math_settings' => [
            'general' => $rm_general,
            'titles' => $rm_titles,
        ],
    ]);
}
