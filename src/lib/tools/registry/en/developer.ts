import type { ToolLocalization } from "../../types";

export const developerEn: Record<string, ToolLocalization> = {
  "dev-json": {
    slug: "json-formatter",
    name: "JSON Formatter and Validator",
    shortDescription:
      "Indent, validate (with the line and column of the error), minify or convert JSON to CSV.",
    description:
      "Paste JSON to validate it, format it with the indentation of your choice, sort its keys, minify it or convert it to CSV. On error, the tool pinpoints the line, the column and the cause (trailing comma, single quotes, unterminated string…), which browser messages do not always do.",
    keywords: [
      "json formatter",
      "format json",
      "json validator",
      "validate json",
      "beautify json",
      "minify json",
      "json to csv",
      "json lint",
    ],
    seo: {
      title: "Format, validate and minify JSON online (line/column errors)",
      description:
        "Free JSON formatter and validator: indentation, key sorting, minification, CSV conversion, errors pinpointed by line and column. Processed locally in your browser.",
    },
    content: {
      steps: [
        "Paste or import your JSON.",
        "Choose format, minify or convert to CSV; fix any reported errors.",
        "Copy or download the result.",
      ],
      limitations: [
        "As required by the JSON standard, comments, trailing commas and single quotes are reported as errors.",
        "CSV conversion expects an array of objects; nested values are encoded as JSON inside the cell.",
        "Files up to 2 MB to stay responsive.",
      ],
      faq: [
        {
          question: "Why is my JSON with comments rejected?",
          answer:
            "Standard JSON allows neither comments, trailing commas nor single quotes. The tool reports these errors with the line and column; remove them or use a JSON5/JSONC format with another tool.",
        },
        {
          question: "How do I convert nested JSON to CSV?",
          answer:
            "The conversion expects an array of flat objects. Nested values (objects, arrays) are encoded as JSON inside the cell; flatten your data before converting if you need one column per field.",
        },
      ],
      privacyNote: "Data is processed in your browser and is never sent to a server.",
    },
  },
  "dev-csv-json": {
    slug: "csv-to-json",
    name: "Convert CSV to JSON",
    shortDescription:
      "Turn a CSV file (separator detected automatically) into a JSON array of objects.",
    description:
      "Convert a CSV export (Excel, Google Sheets, database) into ready-to-use JSON: the separator (semicolon, comma, tab, pipe) is detected automatically, quoted fields and line breaks are handled, and numbers and booleans can be converted.",
    keywords: [
      "csv to json",
      "convert csv to json",
      "csv to json online",
      "excel to json",
      "csv converter",
      "csv json converter",
    ],
    seo: {
      title: "Convert CSV to JSON online (automatic separator detection)",
      description:
        "Turn a CSV into JSON: separator detection, headers, number and boolean conversion, quoted fields. Free and processed locally in your browser.",
    },
    content: {
      steps: [
        "Paste or import your CSV.",
        "Indicate whether the first row contains the headers.",
        "Copy or download the JSON.",
      ],
      limitations: [
        "Rows whose column count differs from the header get empty values for the missing columns.",
        "Dates remain strings.",
      ],
      faq: [
        {
          question: "How is the separator chosen?",
          answer:
            "It is detected from the first rows (comma, semicolon, tab, pipe). If the detection gets it wrong, for example on a single-column CSV, pick it manually in the options.",
        },
        {
          question: "Are numbers and dates converted?",
          answer:
            "Numbers can be converted (option); dates remain strings to avoid any misinterpretation of the format (day/month or month/day).",
        },
      ],
      privacyNote: "Data is processed in your browser and is never sent to a server.",
    },
  },
  "dev-base64": {
    slug: "base64",
    name: "Base64 Encoder and Decoder",
    shortDescription:
      "Convert text (UTF-8) or a file to Base64, and decode a Base64 string, URL-safe variant included.",
    description:
      "Encode text to Base64 (accents and emoji included thanks to UTF-8) or decode a Base64 string received from an API, an email or a configuration file. Also convert a file (image, font, PDF) into a Data URI ready to paste into HTML or CSS. The URL-safe variant and wrapping into 76-character lines are supported.",
    keywords: [
      "base64",
      "base64 encode",
      "base64 decode",
      "base64 online",
      "image to base64",
      "data uri",
      "base64 url safe",
      "base64 converter",
    ],
    seo: {
      title: "Encode and decode Base64 online (text, file, Data URI)",
      description:
        "Encode or decode Base64 (UTF-8, URL-safe, MIME lines) and convert a file into a Data URI. Free, instant, processed locally in your browser.",
    },
    content: {
      steps: [
        "Choose encode or decode.",
        "Paste the text (or drop a file to get a Data URI).",
        "Copy the result.",
      ],
      limitations: [
        "Base64 is not encryption: it protects nothing, it carries bytes as text.",
        "Files up to 5 MB for Data URI conversion (the result is 33% larger than the original).",
      ],
      faq: [
        {
          question: "Does Base64 protect my data?",
          answer:
            "No. It is a reversible encoding that represents bytes as text, not encryption: anyone can decode it. To protect a document, use a password or an encryption tool.",
        },
        {
          question: "What is the difference with the URL-safe variant?",
          answer:
            'It replaces "+" and "/" with "-" and "_" (and often omits the trailing "=") so it can be used in a URL or a file name. The tool decodes both variants.',
        },
      ],
      privacyNote: "Data is processed in your browser and is never sent to a server.",
    },
  },
  "dev-url-encode": {
    slug: "url-encode",
    name: "URL Encoder and Decoder",
    shortDescription:
      "Convert the special characters of a text to %XX (percent-encoding) and decode an encoded URL.",
    description:
      'Encode a query parameter or a full URL according to RFC 3986 (spaces, accents, &, =, ? …) and decode an encoded address to read it in plain text. The "component" mode encodes everything except unreserved characters; the "full URL" mode keeps the structure (/, ?, &, =, #).',
    keywords: [
      "url encode",
      "url decode",
      "url encoder",
      "url decoder",
      "percent encoding",
      "encodeURIComponent",
      "url special characters",
      "%20",
    ],
    seo: {
      title: "Encode and decode a URL online (percent-encoding %XX)",
      description:
        "Encode the special characters of a parameter or a full URL and decode an encoded address. UTF-8, RFC 3986, processed locally in your browser.",
    },
    content: {
      steps: [
        "Choose encode or decode.",
        'Paste the text or the URL; for a full address, tick "Full URL".',
        "Copy the result.",
      ],
      limitations: [
        "Decoding an invalid %XX sequence is reported as an error.",
        '"+" signs are interpreted as spaces when decoding (form convention).',
      ],
      faq: [
        {
          question: "Should I encode the whole URL or only a parameter?",
          answer:
            'Only the values (parameters, segments): encoding a full URL would also transform ":" and "/". Choose component mode for a value, URL mode for a whole address.',
        },
        {
          question: 'Why do "+" signs become spaces when decoding?',
          answer:
            'That is the HTML form convention (application/x-www-form-urlencoded). If your "+" signs are literal, encode them as %2B before decoding.',
        },
      ],
      privacyNote: "Data is processed in your browser and is never sent to a server.",
    },
  },
  "dev-html-entities": {
    slug: "html-entities",
    name: "HTML Escape and Unescape",
    shortDescription: "Convert <, >, &, quotes into HTML entities (&lt;, &amp;…) and back.",
    description:
      "Prepare a code snippet or a text for display in an HTML page by replacing special characters with their entities, or recover the readable text of content full of entities (&eacute;, &#233;, &nbsp;…). Useful for blogs, CMSs, HTML emails and debugging.",
    keywords: [
      "html entities",
      "html escape",
      "html unescape",
      "escape html",
      "&amp;",
      "&lt;",
      "html special characters",
      "html entity converter",
    ],
    seo: {
      title: "Escape and unescape HTML characters online (entities)",
      description:
        "Convert <, >, &, quotes and accented characters into HTML entities and back, instantly and without sending any data.",
    },
    content: {
      steps: ["Choose escape or unescape.", "Paste the text.", "Copy the result."],
      limitations: [
        "Unescaping converts numeric entities (&#233;, &#xE9;) and common named entities; HTML tags are not removed.",
        "Escaping covers & < > \" '; accented characters are kept as they are (UTF-8 being the standard).",
      ],
      faq: [
        {
          question: "Does the tool remove HTML tags?",
          answer:
            'No: it converts special characters into entities and back, without touching tags. To strip HTML from a text, use "Clean Up Text".',
        },
        {
          question: "Why are accented characters not converted into entities?",
          answer:
            'In UTF-8, "é" is valid as is in an HTML page; only & < > and quotes need to be escaped. Numeric entities (&#233;) are still recognized when unescaping.',
        },
      ],
      privacyNote: "Data is processed in your browser and is never sent to a server.",
    },
  },
  "dev-uuid": {
    slug: "uuid-generator",
    name: "UUID Generator",
    shortDescription:
      "Generate one or a hundred random UUID v4 identifiers, lowercase or uppercase, with or without hyphens.",
    description:
      "Create universally unique identifiers (UUID v4, RFC 4122) for your databases, APIs, tests or configuration files: 1 to 100 at a time, lowercase or uppercase, with braces or without hyphens. Randomness comes from the browser's Web Crypto API.",
    keywords: [
      "uuid",
      "uuid generator",
      "guid",
      "uuid v4",
      "unique identifier",
      "generate uuid",
      "uuid online",
      "random uuid",
    ],
    seo: {
      title: "UUID v4 generator online (GUID, up to 100 at a time)",
      description:
        "Generate random UUID v4 identifiers (RFC 4122) in bulk, lowercase or uppercase, with or without hyphens. Browser cryptographic randomness, nothing is sent.",
    },
    content: {
      steps: [
        "Choose the number and the format.",
        'Click "Regenerate" as many times as needed.',
        "Copy or download the list.",
      ],
      limitations: [
        "UUID version 4 only (random); versions 1 (time-based) and 5 (name-based) are not offered.",
        "The identifiers are not kept: reload the page and they are gone.",
      ],
      faq: [
        {
          question: "Are the generated UUIDs truly random?",
          answer:
            "Yes: they come from the browser's cryptographic generator (crypto.randomUUID or getRandomValues), not from predictable pseudo-randomness. The probability of a collision is negligible.",
        },
        {
          question: "Why only version 4?",
          answer:
            "It is the most widely used version and the only one that depends on no data (clock, address, name). Versions 1 and 5 serve specific needs and are not offered.",
        },
      ],
      privacyNote: "Data is processed in your browser and is never sent to a server.",
    },
  },
  "dev-password": {
    slug: "password-generator",
    name: "Password Generator",
    shortDescription:
      "Create strong, random passwords (length, character types, ambiguous characters excluded) with their entropy.",
    description:
      "Generate strong passwords directly in your browser: length from 8 to 64 characters, lowercase, uppercase, digits and symbols as you choose, exclusion of easily confused characters (0/O, 1/l/I), several suggestions at once and an honest strength estimate in bits of entropy. Randomness is cryptographic (Web Crypto) and nothing leaves your device.",
    keywords: [
      "password generator",
      "strong password",
      "random password",
      "create a password",
      "secure password generator",
      "password entropy",
      "password generator online",
    ],
    seo: {
      title: "Strong random password generator (local, nothing sent)",
      description:
        "Create strong passwords: length, character types, ambiguous characters excluded, entropy shown. Cryptographic randomness in your browser.",
    },
    content: {
      steps: [
        "Set the length and the character types.",
        'Click "Generate" for new suggestions.',
        "Copy the password into your password manager.",
      ],
      limitations: [
        "The displayed entropy assumes an attacker who knows the generation rules; it says nothing about a password chosen by hand.",
        "Some websites reject certain symbols: untick them if needed.",
        "Passwords are neither saved nor synced: use a password manager.",
      ],
      faq: [
        {
          question: "What length should I choose?",
          answer:
            "At least 14 characters with all four types (≈ 90 bits) for an important account; 20 or more for an encryption key. Length matters more than symbols.",
        },
      ],
      privacyNote: "Data is processed in your browser and is never sent to a server.",
    },
  },
  "dev-hash": {
    slug: "sha256-hash",
    name: "Compute SHA-256 / SHA-1 / SHA-512 Hash",
    shortDescription:
      "Compute the hash of a text or a file (SHA-256, SHA-1, SHA-384, SHA-512) and compare it with an expected checksum.",
    description:
      "Verify the integrity of a download or compute the hash of a text: SHA-256, SHA-1, SHA-384 and SHA-512 are computed by the browser's Web Crypto API, for typed text or a file up to 500 MB read locally. Paste the hash published by the vendor to see immediately whether it matches.",
    keywords: [
      "sha256",
      "sha256 calculator",
      "file hash",
      "checksum",
      "verify file integrity",
      "sha1",
      "sha512",
      "hash online",
    ],
    seo: {
      title: "Compute the SHA-256 of a file or text online (checksum)",
      description:
        "SHA-256, SHA-1, SHA-384 and SHA-512 hashes of a text or a file (up to 500 MB), comparison with an expected checksum. Computed locally, nothing is sent.",
    },
    content: {
      steps: [
        "Type a text or drop a file.",
        "Read the computed hashes.",
        "Paste the expected hash to compare it.",
      ],
      limitations: [
        "MD5 is not offered (insecure and absent from the Web Crypto API).",
        "Files are read entirely into memory: beyond a few hundred MB, the browser may run out of memory.",
        "Text is hashed as UTF-8 with no trailing newline added: a text file may give a different hash than the same string pasted.",
      ],
      faq: [
        {
          question: "Why is MD5 not offered?",
          answer:
            "MD5 is no longer considered secure and browsers' Web Crypto API does not provide it. To verify a download, prefer SHA-256, today's reference.",
        },
        {
          question: "Why does the hash of pasted text differ from that of the file?",
          answer:
            "A text file often ends with a newline that is absent from pasted text, and the encoding may differ. Hash the file itself to compare with a published checksum.",
        },
      ],
      privacyNote: "Data is processed in your browser and is never sent to a server.",
    },
  },
  "dev-regex": {
    slug: "regex-tester",
    name: "Regular Expression Tester",
    shortDescription:
      "Test a JavaScript regex live: highlighted matches, captured groups, flags, replacement.",
    description:
      "Write or paste a regular expression and immediately see what it captures in your text: highlighted matches, a table of groups (numbered and named), g, i, m, s, u flags, clear error messages and a replacement field with $1, $2 or $<name>. Ready-made patterns (email, URL, phone, date, IBAN) serve as a starting point.",
    keywords: [
      "regex",
      "regex tester",
      "regular expression",
      "regex online",
      "test a regex",
      "javascript regex",
      "regex101",
      "capture groups",
    ],
    seo: {
      title: "Regex tester online (JavaScript): matches and groups",
      description:
        "Test your regular expressions live: match highlighting, captured groups, flags, replacement and ready-made patterns. Processed locally in your browser.",
    },
    content: {
      steps: [
        "Enter the expression and tick the flags.",
        "Paste the test text: matches are highlighted.",
        "Add a replacement to see the transformed text.",
      ],
      limitations: [
        "JavaScript (ECMAScript) syntax: a few differences from PCRE/Python (no variable-length lookbehind in older browsers, no \\A).",
        "A very expensive expression (catastrophic backtracking) can freeze the tab for a moment.",
        "Display is limited to 2,000 matches.",
      ],
      faq: [
        {
          question: "Does my Python or PCRE regex give the same result here?",
          answer:
            "Not always: the syntax is JavaScript's (ECMAScript). A few differences: no \\A or \\Z, limited lookbehind in older browsers, different flags. Test the edge cases.",
        },
        {
          question: "Why does the page freeze with some expressions?",
          answer:
            "Nested quantifiers (for example (a+)+) cause catastrophic backtracking. Simplify the expression or limit the input; the display is capped at 2,000 matches anyway.",
        },
      ],
      privacyNote: "Data is processed in your browser and is never sent to a server.",
    },
  },
  "dev-timestamp": {
    slug: "timestamp-converter",
    name: "Unix Timestamp Converter",
    shortDescription:
      "Convert a Unix timestamp (seconds or milliseconds) into a readable date and back, with time zone and ISO 8601.",
    description:
      "Turn a Unix timestamp (seconds or milliseconds, detected automatically) into a full date: ISO 8601, UTC, local time with time zone, relative time, day of the year and ISO week. In the other direction, pick a date or type it in French date format to get its timestamp. The current time is displayed continuously.",
    keywords: [
      "timestamp converter",
      "unix timestamp",
      "epoch converter",
      "timestamp to date",
      "date to timestamp",
      "unix time",
      "epoch time",
      "convert timestamp",
    ],
    seo: {
      title: "Unix timestamp to date converter (seconds, milliseconds, ISO)",
      description:
        "Convert a Unix timestamp into a readable date (ISO 8601, UTC, local time, relative) and a date into a timestamp. Seconds/milliseconds detection, processed locally.",
    },
    content: {
      steps: [
        "Paste a timestamp or a date (ISO, or DD/MM/YYYY French format).",
        "Read the conversions in every format.",
        "Copy the value you want.",
      ],
      limitations: [
        "Values below 10¹¹ are interpreted as seconds, above as milliseconds.",
        "The local time zone is your device's; dates entered without a time zone are interpreted in that zone.",
      ],
      faq: [
        {
          question: "Seconds or milliseconds: how does the tool decide?",
          answer:
            "A value below 10¹¹ is read as seconds, above as milliseconds (JavaScript timestamp convention). You can force the unit if your source is unusual.",
        },
        {
          question: "Which time zone is used?",
          answer:
            "Your device's time zone, shown next to the date, along with the UTC and ISO 8601 versions. A date entered without a time zone is interpreted in that local zone.",
        },
      ],
      privacyNote: "Data is processed in your browser and is never sent to a server.",
    },
  },
};
