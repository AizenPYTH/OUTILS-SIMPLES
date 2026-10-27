import type { ToolLocalization } from "../../types";

export const calculatorsEn: Record<string, ToolLocalization> = {
  "calc-percent": {
    slug: "percentage",
    name: "Percentage Calculator",
    shortDescription:
      "Work out X% of a number, a share of a total, a change between two values, a discount or the price before an increase.",
    description:
      "Every common percentage question, each in its own box: how much is 20% of 150, what percentage 30 is of 150, the change between two values, the price after a 30% discount, and what the price was before a 20% increase. Results update as you type; comma or point decimal separators are both accepted.",
    keywords: [
      "percentage calculator",
      "calculate percentage",
      "percent of a number",
      "percentage change",
      "discount calculator",
      "percentage increase",
      "rule of three",
      "percent difference",
    ],
    seo: {
      title: "Percentage Calculator: Share, Change, Discount, Reverse",
      description:
        "Calculate X% of a number, the share of a total, the change between two values, a discount or the price before an increase. Instant results, no data sent.",
    },
    content: {
      steps: [
        "Pick the box that matches your question.",
        "Enter the values (comma or point decimals).",
        "Read the result, updated instantly.",
      ],
      limitations: [
        "Results are rounded to two decimal places (four for small values).",
        "The change is undefined when the starting value is 0.",
      ],
      faq: [
        {
          question: "How do I get a pre-tax price from a tax-inclusive price?",
          answer:
            'Use the last box, "Find the value before a change", with a change of +20 (or the VAT tool, which handles all the French rates).',
        },
      ],
      privacyNote:
        "Calculations run instantly in your browser; nothing you enter is transmitted or stored.",
    },
  },
  "calc-vat": {
    slug: "vat",
    name: "VAT Calculator",
    shortDescription:
      "Convert between net and gross amounts with the French VAT rates (20, 10, 5.5, 2.1%) or a custom rate.",
    description:
      "Calculate VAT from a net (pre-tax) amount, a gross (tax-inclusive) amount or the VAT amount itself, using the rates in force in France (standard, intermediate, reduced, super-reduced, overseas departments) or any custom rate. A table instantly compares every rate for the same amount, rounded to the cent.",
    keywords: [
      "vat calculator",
      "calculate vat",
      "net to gross",
      "gross to net",
      "vat 20%",
      "vat 5.5%",
      "vat amount",
      "price excluding vat",
    ],
    seo: {
      title: "VAT Calculator: Net, Gross and VAT Amount (French Rates)",
      description:
        "Convert net to gross and gross to net with the French VAT rates or a custom rate, rounded to the cent, with a comparison of every rate. Free and processed locally.",
    },
    content: {
      steps: [
        "Enter the amount you know (net, gross or VAT).",
        "Choose the rate.",
        "Read the net, VAT and gross figures, and compare the other rates.",
      ],
      limitations: [
        "Rounded to the cent at every step, as on an invoice; the sum of several lines can differ by one cent from a single overall calculation.",
        "The rates shown are those of mainland France and its overseas departments; the rules on which rate applies to which product are not covered.",
      ],
      faq: [
        {
          question: "Why does the total of several lines differ by one cent?",
          answer:
            "Each amount is rounded to the cent, as on an invoice; the sum of the rounded amounts can differ by one cent from an overall calculation. This is the behavior most invoicing software expects.",
        },
        {
          question: "Which rate applies to my product?",
          answer:
            "The calculator offers the French rates (20%, 10%, 5.5%, 2.1%) and a custom rate, but does not determine which one applies: that depends on the nature of the goods or service and is a matter of tax regulation.",
        },
      ],
      privacyNote:
        "Calculations run instantly in your browser; nothing you enter is transmitted or stored.",
    },
  },
  "calc-dates": {
    slug: "days-between-dates",
    name: "Days Between Dates & Working Days",
    shortDescription:
      "Count calendar and working days between two dates, add working days to a date, and list French public holidays.",
    description:
      "Calculate the time between two dates in years, months, days, weeks and working days (Monday to Friday, French public holidays excluded, Alsace-Moselle option), find the date you get by adding or subtracting a number of calendar or working days (legal deadlines, deliveries, notice periods), and look up the public holidays of any year.",
    keywords: [
      "days between two dates",
      "working days calculator",
      "number of days between dates",
      "count days",
      "add working days to a date",
      "public holidays 2026",
      "business days deadline",
      "date calculator",
    ],
    seo: {
      title: "Days Between Two Dates and Working Days (French Holidays)",
      description:
        "Calculate the time between two dates, working days excluding French public holidays, add working days to a date and list a year's public holidays. Local.",
    },
    content: {
      steps: [
        "Enter both dates (the end date is included in the working-day count).",
        "Choose whether public holidays are excluded.",
        "Read the duration, the working days and the holidays counted.",
      ],
      limitations: [
        'Working days = Monday to Friday. Six-day "workable days" (Monday to Saturday) are not offered.',
        "National statutory public holidays only (plus Alsace-Moselle as an option); bridge days, local festivals and collective agreements are not taken into account.",
        "Durations in months follow the calendar (January 31 + 1 month = February 28 or 29).",
      ],
      faq: [
        {
          question: "Is the end date counted?",
          answer:
            "In the calendar-day count, no (from the 1st to the 2nd = 1 day). In working days, yes: Monday to Friday = 5 working days, the way a period of work is usually counted.",
        },
      ],
      privacyNote:
        "Calculations run instantly in your browser; nothing you enter is transmitted or stored.",
    },
  },
  "calc-units": {
    slug: "unit-converter",
    name: "Unit Converter",
    shortDescription:
      "Convert lengths, masses, temperatures, volumes, areas, speeds, data, durations and energies.",
    description:
      "A converter for everyday and professional units: meters and miles, kilos and pounds, Celsius and Fahrenheit, liters and gallons, hectares and acres, km/h and knots, megabytes and gibibytes, hours and weeks, kilowatt-hours and kilocalories. The result is shown in every unit of the quantity at once.",
    keywords: [
      "unit converter",
      "convert units",
      "inches to cm",
      "miles to km",
      "celsius to fahrenheit",
      "pounds to kg",
      "gallons to liters",
      "mb to gb",
    ],
    seo: {
      title: "Unit Converter: Length, Mass, Temperature, Data and More",
      description:
        "Convert lengths, masses, temperatures, volumes, areas, speeds, data, durations and energies, with every unit displayed at once. Free and processed locally.",
    },
    content: {
      steps: [
        "Choose the quantity (length, mass, etc.).",
        "Enter the value and the source and target units.",
        "Read the result and the table of every unit.",
      ],
      limitations: [
        "Common units of measurement; historical or regional units (league, bushel, etc.) are not included.",
        "US volumes (gallon, cup): British imperial units differ slightly.",
        "Precision limited to 10 significant digits.",
      ],
      faq: [
        {
          question: "Why isn't 1 GB equal to 1 GiB?",
          answer:
            'A gigabyte (GB) is 10⁹ bytes; a gibibyte (GiB) is 2³⁰ = 1,073,741,824 bytes. Disk manufacturers count in GB, operating systems often in GiB: hence the 931 "GB" shown for a 1 TB drive.',
        },
      ],
      privacyNote:
        "Calculations run instantly in your browser; nothing you enter is transmitted or stored.",
    },
  },
};
