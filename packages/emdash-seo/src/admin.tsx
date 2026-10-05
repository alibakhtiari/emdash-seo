import { SettingsPage, FIELDS, Field, BreadcrumbLabelsEditor, BreadcrumbRulesEditor, apiFetch } from './admin/settings-page.js';
import { ReadabilityAdminPage, ImageAltAuditorAdminPage } from './admin/standalone-pages.js';
import { extractTextFromContent, extractAllImagesFromContent, type ContentEditorPanelProps } from './admin/content-helpers.js';
import { ContentEditorSeoPanel, contentEditorPanels } from './admin/content-editor-panel.js';
import { FuzzyRedirectsPage } from './admin-redirects.js';
import { SerpPreviewPage, LiveSentenceHighlighter, ImageAltAuditorWidget } from './admin-preview.js';
import { FocusKeywordFieldWidget, SeoSuiteFieldWidget } from './admin/fields/index.js';

export const pages = {
  '/settings': SettingsPage,
  '/preview': SerpPreviewPage,
  '/fuzzy-redirects': FuzzyRedirectsPage,
  '/readability': ReadabilityAdminPage,
  '/alt-auditor': ImageAltAuditorAdminPage,
};

export const fields = {
  'focus-keyword': FocusKeywordFieldWidget,
  'seo-suite': SeoSuiteFieldWidget,
};

export {
  SettingsPage,
  SerpPreviewPage,
  FuzzyRedirectsPage,
  ReadabilityAdminPage,
  ImageAltAuditorAdminPage,
  LiveSentenceHighlighter,
  ImageAltAuditorWidget,
  ContentEditorSeoPanel,
  contentEditorPanels,
  FocusKeywordFieldWidget,
  SeoSuiteFieldWidget,
  extractTextFromContent,
  extractAllImagesFromContent,
  type ContentEditorPanelProps,
  FIELDS,
  Field,
  BreadcrumbLabelsEditor,
  BreadcrumbRulesEditor,
  apiFetch,
};

export default pages;

