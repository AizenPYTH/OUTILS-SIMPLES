import {
  PDFCheckBox,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFSignature,
  PDFTextField,
  PDFButton,
  PDFName,
  type PDFField,
  type PDFDocument,
} from "pdf-lib";
import { toPdfError } from "../errors";
import { loadPdfDocument, savePdfDocument } from "../load";

export type FormFieldKind = "text" | "checkbox" | "radio" | "dropdown" | "optionlist" | "button" | "signature" | "unknown";

export interface FormFieldInfo {
  name: string;
  kind: FormFieldKind;
  /** 0-based page index of the first widget, when it can be resolved. */
  pageIndex: number | null;
  readOnly: boolean;
  required: boolean;
  multiline: boolean;
  options: string[];
  /** Current value: string for text/choice, boolean for checkbox, string[] for option lists. */
  value: string | boolean | string[] | null;
  maxLength: number | null;
}

export type FormValues = Record<string, string | boolean | string[]>;

export interface FormInspection {
  fields: FormFieldInfo[];
  hasXfa: boolean;
}

function kindOf(field: PDFField): FormFieldKind {
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFCheckBox) return "checkbox";
  if (field instanceof PDFRadioGroup) return "radio";
  if (field instanceof PDFDropdown) return "dropdown";
  if (field instanceof PDFOptionList) return "optionlist";
  if (field instanceof PDFSignature) return "signature";
  if (field instanceof PDFButton) return "button";
  return "unknown";
}

function resolvePageIndex(doc: PDFDocument, field: PDFField): number | null {
  try {
    const widgets = field.acroField.getWidgets();
    const widget = widgets[0];
    if (!widget) return null;
    const pageRef = widget.P();
    const pages = doc.getPages();
    if (pageRef) {
      const index = pages.findIndex((p) => p.ref === pageRef);
      if (index >= 0) return index;
    }
    // Fallback: find the page whose /Annots contains the widget.
    const widgetRef = doc.context.getObjectRef(widget.dict);
    if (!widgetRef) return null;
    for (let i = 0; i < pages.length; i += 1) {
      const annots = pages[i]!.node.Annots();
      if (!annots) continue;
      for (let j = 0; j < annots.size(); j += 1) {
        if (annots.get(j) === widgetRef) return i;
      }
    }
  } catch {
    return null;
  }
  return null;
}

/** Lists interactive (AcroForm) fields. XFA forms are flagged, not parsed. */
export async function inspectForm(bytes: Uint8Array): Promise<FormInspection> {
  const doc = await loadPdfDocument(bytes);
  return inspectFormDocument(doc);
}

export function inspectFormDocument(doc: PDFDocument): FormInspection {
  const form = doc.getForm();
  const hasXfa = form.acroForm.dict.has(PDFName.of("XFA"));
  const fields: FormFieldInfo[] = [];
  for (const field of form.getFields()) {
    const kind = kindOf(field);
    const info: FormFieldInfo = {
      name: field.getName(),
      kind,
      pageIndex: resolvePageIndex(doc, field),
      readOnly: field.isReadOnly(),
      required: field.isRequired(),
      multiline: false,
      options: [],
      value: null,
      maxLength: null,
    };
    if (field instanceof PDFTextField) {
      info.multiline = field.isMultiline();
      info.value = field.getText() ?? "";
      info.maxLength = field.getMaxLength() ?? null;
    } else if (field instanceof PDFCheckBox) {
      info.value = field.isChecked();
    } else if (field instanceof PDFRadioGroup) {
      info.options = field.getOptions();
      info.value = field.getSelected() ?? "";
    } else if (field instanceof PDFDropdown) {
      info.options = field.getOptions();
      info.value = field.getSelected()[0] ?? "";
    } else if (field instanceof PDFOptionList) {
      info.options = field.getOptions();
      info.value = field.getSelected();
    }
    fields.push(info);
  }
  return { fields, hasXfa };
}

export interface FillFormOptions {
  flatten: boolean;
}

/** Applies values and returns the new bytes. Unknown names and read-only fields are skipped. */
export async function fillForm(bytes: Uint8Array, values: FormValues, options: FillFormOptions): Promise<Uint8Array> {
  const doc = await loadPdfDocument(bytes);
  const form = doc.getForm();
  try {
    for (const field of form.getFields()) {
      const name = field.getName();
      if (!(name in values) || field.isReadOnly()) continue;
      const value = values[name]!;
      if (field instanceof PDFTextField && typeof value === "string") {
        field.setText(value);
      } else if (field instanceof PDFCheckBox && typeof value === "boolean") {
        if (value) field.check();
        else field.uncheck();
      } else if (field instanceof PDFRadioGroup && typeof value === "string") {
        if (value && field.getOptions().includes(value)) field.select(value);
      } else if (field instanceof PDFDropdown && typeof value === "string") {
        if (value && field.getOptions().includes(value)) field.select(value);
        else if (!value) field.clear();
      } else if (field instanceof PDFOptionList && Array.isArray(value)) {
        const allowed = value.filter((v) => field.getOptions().includes(v));
        if (allowed.length) field.select(allowed);
        else field.clear();
      }
    }
    form.updateFieldAppearances();
    if (options.flatten) form.flatten();
  } catch (error) {
    throw toPdfError(error);
  }
  return savePdfDocument(doc);
}
