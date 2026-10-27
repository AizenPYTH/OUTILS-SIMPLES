import type { ToolLocalization } from "../../types";

export const textEn: Record<string, ToolLocalization> = {
  "text-word-counter": {
    slug: "word-counter",
    name: "Word Counter",
    shortDescription:
      "Count words, characters, sentences and paragraphs, with an estimated reading time.",
    description:
      "Paste a text to instantly get its number of words, characters (with and without spaces), sentences, paragraphs and lines, plus an estimate of the reading time and read-aloud time. The most frequent words are listed so you can spot repetitions.",
    keywords: [
      "word counter",
      "word count",
      "character count",
      "count words",
      "reading time",
      "character counter",
      "text length",
      "word counter online",
    ],
    seo: {
      title: "Word and character counter online (with reading time)",
      description:
        "Count the words, characters, sentences and paragraphs of a text and estimate its reading time. Free, instant, no data sent.",
    },
    content: {
      steps: [
        "Paste or type your text (or import a .txt file).",
        "The statistics update as you type.",
        "Check the most frequent words to spot repetitions.",
      ],
      limitations: [
        "A word is a sequence of characters separated by spaces that contains at least one letter or digit; isolated punctuation is not counted.",
        "Reading time is an estimate (200 words/min for silent reading, 130 words/min aloud).",
      ],
      faq: [
        {
          question: "Do spaces count as characters?",
          answer:
            "Both values are shown: the total number of characters (spaces and line breaks included) and the count without spaces, often used for form limits.",
        },
      ],
      privacyNote:
        "The text is processed instantly in your browser: nothing is sent to a server, nothing is kept.",
    },
  },
  "text-case": {
    slug: "change-case",
    name: "Change Text Case",
    shortDescription:
      "Convert a text to UPPERCASE, lowercase, Sentence case, Title Case, snake_case, kebab-case or camelCase.",
    description:
      "Change the case of a text in one click: all uppercase, all lowercase, first letter of each sentence, each word capitalized, title case that keeps French short words lowercase, inverted case, and the technical formats snake_case, kebab-case and camelCase. Accented characters are handled correctly (É, À, Ç…).",
    keywords: [
      "uppercase",
      "lowercase",
      "convert to uppercase",
      "change case",
      "title case",
      "capitalize text",
      "camelcase converter",
      "snake case",
    ],
    seo: {
      title: "Convert text to uppercase or lowercase online (change case)",
      description:
        "Turn a text into uppercase, lowercase, sentence case, title case, snake_case, kebab-case or camelCase, accents included. Instant and free.",
    },
    content: {
      steps: [
        "Paste your text.",
        "Choose the case format you want.",
        "Copy or download the result.",
      ],
      limitations: [
        'The "Title Case" format keeps common French function words (de, la, le, et…) in lowercase, except at the start of the text.',
        "The technical formats (snake_case, kebab-case, camelCase) strip accents and punctuation.",
      ],
      faq: [
        {
          question: "Why do some words stay lowercase in Title Case?",
          answer:
            'Title Case follows French usage: common function words (de, la, le, et, à…) keep their lowercase, except at the start of the text. Use "Capitalize Each Word" if you want everything capitalized.',
        },
        {
          question: "What happens to accents in snake_case or camelCase?",
          answer:
            "These technical formats strip accents and punctuation to produce valid identifiers (variables, keys). The original text is not modified until you copy the result.",
        },
      ],
      privacyNote:
        "The text is processed instantly in your browser: nothing is sent to a server, nothing is kept.",
    },
  },
  "text-clean": {
    slug: "clean-text",
    name: "Clean Up Text",
    shortDescription:
      "Remove extra spaces, blank lines and duplicates, rejoin lines broken by a PDF, sort lines.",
    description:
      "Clean up a text pasted from a PDF, an email or a web page: trim spaces at the start and end of lines, collapse multiple spaces, remove blank or duplicate lines, repair words split by a hyphen, rejoin broken lines, natural alphabetical sorting and quote normalization. Each option can be enabled separately and the result updates live.",
    keywords: [
      "clean text",
      "remove extra spaces",
      "remove blank lines",
      "remove duplicate lines",
      "sort lines",
      "text copied from pdf",
      "fix line breaks",
      "sort alphabetically",
    ],
    seo: {
      title: "Clean up text online: spaces, blank lines, duplicates, sorting",
      description:
        "Remove extra spaces, blank lines and duplicate lines, rejoin lines broken by a PDF and sort lines. Instant result, no data sent.",
    },
    content: {
      steps: [
        "Paste the text to clean up.",
        "Tick the operations you want; the result updates live.",
        "Copy or download the cleaned text.",
      ],
      limitations: [
        "Rejoining lines keeps paragraphs that are separated by a blank line; a text with no blank lines will be rejoined into a single paragraph.",
        "Sorting uses French natural order (item2 before item10, accents ignored).",
      ],
      faq: [
        {
          question: "Why does text copied from a PDF have line breaks everywhere?",
          answer:
            'A PDF stores positioned lines, not paragraphs. When you copy, each visual line becomes a line break. The "Rejoin broken lines" option rebuilds the paragraphs, and "Repair split words" removes hyphenation dashes.',
        },
      ],
      privacyNote:
        "The text is processed instantly in your browser: nothing is sent to a server, nothing is kept.",
    },
  },
  "text-diff": {
    slug: "compare-texts",
    name: "Compare Two Texts",
    shortDescription: "Highlight the differences between two texts, by lines, words or characters.",
    description:
      "Compare two versions of a text, a contract, a list or a code file: additions appear in green, deletions in red, with a summary of the changes. Choose the granularity (lines, words or characters), ignore case or whitespace, then copy the diff in unified format.",
    keywords: [
      "compare two texts",
      "text difference",
      "text diff",
      "text compare tool",
      "compare files",
      "find differences",
      "diff online",
      "compare versions",
    ],
    seo: {
      title: "Compare two texts online and see the differences (diff)",
      description:
        "Free text comparison tool: differences by lines, words or characters, additions in green, deletions in red, diff export. Processed locally in your browser.",
    },
    content: {
      steps: [
        "Paste the original text on the left and the modified text on the right.",
        "Choose the granularity (lines, words, characters).",
        "Read the highlighted differences or copy the diff.",
      ],
      limitations: [
        'The algorithm (Myers, via the open source "diff" library) finds the smallest set of changes; on very different texts, the result may look less readable than a manual comparison.',
        "Texts up to about 2 MB to stay smooth.",
      ],
      faq: [
        {
          question: "Which granularity should I choose?",
          answer:
            '"Words" to proofread a new version of a text, "Lines" for code or lists, "Characters" to spot a typo or a changed digit. Line mode is the most readable on long documents.',
        },
        {
          question: "Can I compare two files instead of pasted text?",
          answer:
            'Yes, each area accepts a text file (.txt, .md, .csv…). For two PDFs, use "Compare two PDFs", which extracts the text page by page.',
        },
      ],
      privacyNote:
        "The text is processed instantly in your browser: nothing is sent to a server, nothing is kept.",
    },
  },
  "text-slug": {
    slug: "slug-generator",
    name: "URL Slug Generator",
    shortDescription:
      "Turn a title into a clean URL slug: lowercase, no accents, words separated by hyphens.",
    description:
      "Create readable web addresses from your article, product or page titles: accents are removed, punctuation and spaces are replaced with a separator, and everything is lowercased. Process several titles at once (one per line) and limit the length for short URLs.",
    keywords: [
      "slug generator",
      "slugify",
      "clean url",
      "title to url",
      "url slug",
      "clean file name",
      "permalink generator",
      "seo friendly url",
    ],
    seo: {
      title: "URL slug generator online (title to clean URL)",
      description:
        "Turn a title into a slug: lowercase, no accents, hyphens, limited length, several titles at once. Free, instant, no data sent.",
    },
    content: {
      steps: [
        "Paste one or more titles (one per line).",
        "Choose the separator and a maximum length if needed.",
        "Copy the slugs.",
      ],
      limitations: [
        "Only Latin characters are transliterated (accents); non-Latin alphabets are removed.",
        "The slug does not guarantee that a URL is unique: check that on the website side.",
      ],
      faq: [
        {
          question: "Is the generated slug unique?",
          answer:
            "No: it is derived from the title, and two identical titles give the same slug. Uniqueness is checked on the website side (CMS, database), often by adding a numeric suffix.",
        },
        {
          question: "What happens to non-Latin characters?",
          answer:
            "Accented letters are transliterated (é → e, ß → ss); non-Latin alphabets (Cyrillic, Arabic, Chinese) are removed. For those languages, write a slug by hand or in romanized transliteration.",
        },
      ],
      privacyNote:
        "The text is processed instantly in your browser: nothing is sent to a server, nothing is kept.",
    },
  },
};
