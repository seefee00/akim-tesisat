import { useMemo } from "react";
import { formatTL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

// Full: 100mm x 30mm, 16 per A4 (2 cols x 8 rows)
// Half: 50mm x 30mm, 36 per A4 (4 cols x 9 rows)
const CONFIG = {
  full: { cols: 2, perPage: 16, widthClass: "label-full" },
  half: { cols: 4, perPage: 36, widthClass: "label-half" },
};

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function PrintPreview({ type, items, onClose }) {
  const cfg = CONFIG[type];

  // Expand items by their print quantity into a flat label list
  const labels = useMemo(() => {
    const flat = [];
    items.forEach((it) => {
      const qty = Math.max(1, parseInt(it.qty) || 1);
      for (let i = 0; i < qty; i++) flat.push(it);
    });
    return flat;
  }, [items]);

  const pages = chunk(labels, cfg.perPage);

  const esc = (s) =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const buildHtml = () => {
    const isFull = type === "full";
    const cols = isFull ? 2 : 4;
    const colW = isFull ? "100mm" : "50mm";
    const nameSize = isFull ? "15pt" : "9pt";
    const priceSize = isFull ? "17pt" : "11pt";

    const pagesHtml = pages
      .map((page) => {
        const labelsHtml = page
          .map(
            (l) =>
              `<div class="label"><span class="name">${esc(
                l.name
              )}</span><span class="price">${esc(formatTL(l.price))}</span></div>`
          )
          .join("");
        return `<div class="a4"><div class="grid">${labelsHtml}</div></div>`;
      })
      .join("");

    return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8">
<title>Etiket Baskı</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #fff; }
  body { font-family: "IBM Plex Sans", Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .a4 { width: 210mm; min-height: 297mm; padding: 13mm 5mm; page-break-after: always; }
  .a4:last-child { page-break-after: auto; }
  .grid { display: grid; grid-template-columns: repeat(${cols}, ${colW}); grid-auto-rows: 30mm; justify-content: center; }
  .label { width: ${colW}; height: 30mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; overflow: hidden; padding: 1mm 2mm; border: 1px dashed #cfcfcf; page-break-inside: avoid; color: #000; }
  .name { font-weight: 600; line-height: 1.15; font-size: ${nameSize}; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .price { font-family: "IBM Plex Sans", Arial, sans-serif; font-weight: 700; font-size: ${priceSize}; margin-top: 1.5mm; font-variant-numeric: tabular-nums; }
</style></head><body>${pagesHtml}</body></html>`;
  };

  const doPrint = () => {
    if (labels.length === 0) return;
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(buildHtml());
    doc.close();
    const cleanup = () => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    };
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        console.error("print error", e);
      }
      setTimeout(cleanup, 1500);
    }, 350);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#111827]/60 overflow-auto print-overlay">
      {/* Toolbar (hidden on print) */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold tracking-tight text-[#111827]">
            {type === "full" ? "Tam Etiket" : "Yarım Etiket"} Önizleme
          </h2>
          <p className="text-sm text-[#6B7280]">
            {labels.length} etiket · {pages.length} sayfa (A4){" "}
            {type === "full" ? "· 100×30mm · 16/sayfa" : "· 50×30mm · 36/sayfa"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={doPrint}
            data-testid="do-print-button"
            className="bg-[#4338CA] hover:bg-[#3730A3]"
          >
            <Printer className="w-4 h-4 mr-2" />
            Yazdır
          </Button>
          <Button variant="outline" onClick={onClose} data-testid="close-print-button">
            <X className="w-4 h-4 mr-2" />
            Kapat
          </Button>
        </div>
      </div>

      {/* Printable area */}
      <div className="print-section flex flex-col items-center gap-6 py-8">
        {pages.map((page, pi) => (
          <div key={pi} className="a4-page">
            <div className={`label-grid ${type === "full" ? "grid-full" : "grid-half"}`}>
              {page.map((label, li) => (
                <div key={li} className={`label ${cfg.widthClass}`} data-testid="print-label">
                  <span className="label-name">{label.name}</span>
                  <span className="label-price">{formatTL(label.price)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
