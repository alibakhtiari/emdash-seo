/**
 * Dictionaries and word lists for Cognitive Readability Linter.
 */

/**
 * Common English honorifics and abbreviations that do not terminate a sentence.
 */
export const ABBREVIATIONS_NO_TERMINATE: ReadonlySet<string> = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'rev', 'gen', 'col', 'lt',
  'vs', 'approx', 'dept', 'est', 'apt', 'inc', 'ltd', 'co', 'corp', 'no',
  'e.g', 'i.e', 'u.s', 'u.k', 'u.s.a', 'e.u', 'al', 'fig', 'jan', 'feb', 'mar',
  'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec',
  'a.m', 'p.m',
]);

/**
 * Irregular past participles for passive voice detection.
 */
export const IRREGULAR_PAST_PARTICIPLES: ReadonlySet<string> = new Set([
  'arisen', 'awoken', 'beaten', 'become', 'been', 'begun', 'bent', 'beset',
  'bitten', 'bled', 'blown', 'born', 'borne', 'bought', 'bound', 'broken',
  'brought', 'built', 'burnt', 'burst', 'cast', 'caught', 'chosen', 'clad',
  'clung', 'come', 'cost', 'crept', 'cut', 'dealt', 'dug', 'done', 'drawn',
  'dreamt', 'driven', 'drunk', 'eaten', 'fallen', 'fed', 'felt', 'fought',
  'found', 'fit', 'fled', 'flung', 'flown', 'forbidden', 'forgiven', 'forgotten',
  'forsaken', 'frozen', 'gotten', 'got', 'given', 'gone', 'ground', 'grown',
  'hung', 'heard', 'hidden', 'hit', 'held', 'hurt', 'kept', 'knelt', 'known',
  'laid', 'led', 'leapt', 'learnt', 'left', 'lent', 'let', 'lost', 'made',
  'meant', 'met', 'mistaken', 'mown', 'overcome', 'overdone', 'overtaken',
  'paid', 'proven', 'put', 'quit', 'read', 'rebuilt', 'redone', 'reset',
  'rewritten', 'ridden', 'risen', 'run', 'said', 'seen', 'sought', 'sold',
  'sent', 'set', 'sewn', 'shaken', 'shaven', 'shorn', 'shot', 'shown',
  'shrunk', 'shut', 'sung', 'sunk', 'sat', 'slain', 'slept', 'slid', 'slit',
  'smitten', 'sown', 'spoken', 'sped', 'spent', 'spilt', 'spun', 'spit',
  'split', 'spread', 'sprung', 'stood', 'stolen', 'stuck', 'stung', 'stunk',
  'struck', 'strung', 'striven', 'sworn', 'swept', 'swollen', 'swum', 'swung',
  'taken', 'taught', 'torn', 'told', 'thought', 'thrived', 'thrown', 'thrust',
  'trodden', 'understood', 'undertaken', 'upset', 'woken', 'worn', 'woven',
  'wept', 'won', 'wound', 'withdrawn', 'withheld', 'withstood', 'wrung', 'written',
]);

/**
 * Words ending in -ed that are base nouns or non-participles to avoid false positives.
 */
export const NON_PARTICIPLES_ENDING_IN_ED: ReadonlySet<string> = new Set([
  'red', 'bed', 'sled', 'shed', 'speed', 'bleed', 'feed', 'need', 'reed',
  'seed', 'weed', 'breed', 'steed', 'hundred', 'naked', 'wicked', 'crooked',
  'sacred', 'beloved',
]);

/**
 * ~100 Transition words and multi-word phrases for readability scoring.
 */
export const TRANSITION_WORDS: readonly string[] = [
  // Addition & Continuation
  'in addition', 'furthermore', 'moreover', 'additionally', 'what is more',
  'as well as', 'coupled with', 'not only', 'first of all', 'to begin with',
  'in the first place', 'in the second place', 'firstly', 'secondly', 'thirdly',
  'finally', 'lastly', 'also', 'besides', 'along with',

  // Contrast & Concession
  'however', 'nevertheless', 'nonetheless', 'on the other hand', 'in contrast',
  'on the contrary', 'by contrast', 'conversely', 'even though', 'although',
  'though', 'despite this', 'in spite of', 'even so', 'be that as it may',
  'at the same time', 'whereas', 'while', 'yet', 'alternatively',

  // Cause, Effect & Result
  'therefore', 'consequently', 'as a result', 'thus', 'hence',
  'accordingly', 'for this reason', 'as a consequence', 'because of this', 'due to this',
  'in consequence', 'so that',

  // Example & Illustration
  'for example', 'for instance', 'in particular', 'specifically', 'to illustrate',
  'as an illustration', 'such as', 'namely', 'take for example', 'case in point',

  // Clarification & Emphasis
  'in other words', 'that is to say', 'to clarify', 'to put it another way',
  'indeed', 'in fact', 'certainly', 'undoubtedly', 'above all', 'most importantly',
  'especially', 'notably', 'significantly', 'clearly', 'obviously', 'of course',
  'without a doubt', 'by all means',

  // Comparison & Similarity
  'similarly', 'likewise', 'in the same way', 'in like manner', 'by the same token',
  'comparatively', 'equally', 'just as',

  // Conclusion & Summary
  'in conclusion', 'to sum up', 'in summary', 'to summarize', 'ultimately',
  'all in all', 'in short', 'in brief', 'to conclude', 'on the whole',
  'in the end', 'all things considered', 'as shown above',

  // Time, Sequence & Condition
  'meanwhile', 'subsequently', 'thereafter', 'afterwards', 'beforehand',
  'at present', 'eventually', 'in the meantime', 'from now on', 'as long as',
  'provided that', 'in that case', 'given these points',
];

/**
 * Common complex words (>= 3 syllables) and their simpler plain-language alternatives.
 */
export const COMPLEX_WORD_ALTERNATIVES: Record<string, string> = {
  utilize: 'use',
  utilizes: 'uses',
  utilized: 'used',
  utilizing: 'using',
  utilization: 'use',
  commence: 'start',
  commences: 'starts',
  commenced: 'started',
  commencing: 'starting',
  terminate: 'end',
  terminates: 'ends',
  terminated: 'ended',
  terminating: 'ending',
  termination: 'end',
  substantiate: 'prove',
  substantiates: 'proves',
  substantiated: 'proved',
  substantiating: 'proving',
  implement: 'carry out',
  implemented: 'carried out',
  implementation: 'setup',
  facilitate: 'help',
  facilitates: 'helps',
  facilitated: 'helped',
  facilitating: 'helping',
  demonstrate: 'show',
  demonstrates: 'shows',
  demonstrated: 'showed',
  demonstrating: 'showing',
  discontinue: 'stop',
  discontinued: 'stopped',
  eliminate: 'remove',
  eliminated: 'removed',
  expedite: 'speed up',
  expedited: 'sped up',
  consequently: 'so',
  additionally: 'also',
  subsequently: 'later',
  approximately: 'about',
  sufficient: 'enough',
  numerous: 'many',
  substantially: 'greatly',
  predominantly: 'mostly',
  fundamentally: 'basically',
  comprehend: 'understand',
  remuneration: 'payment',
  modification: 'change',
  modifications: 'changes',
  notification: 'notice',
  endeavor: 'try',
  endeavors: 'tries',
  accomplish: 'do',
  accomplished: 'done',
  advantageous: 'helpful',
  ameliorate: 'improve',
  anticipate: 'expect',
  ascertain: 'learn',
  disseminate: 'spread',
  exclusively: 'only',
  fundamental: 'basic',
  inadvertently: 'by mistake',
  initialize: 'start',
  magnitude: 'size',
  necessitate: 'require',
  nevertheless: 'still',
  objective: 'goal',
  optimum: 'best',
  optimal: 'best',
  proficiency: 'skill',
  proximity: 'nearness',
  reimburse: 'pay back',
  remainder: 'rest',
  stipulate: 'require',
  supplementary: 'extra',
  ubiquitous: 'everywhere',
  deteriorate: 'worsen',
  deteriorated: 'worsened',
};
