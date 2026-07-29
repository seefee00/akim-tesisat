import { useMemo } from "react";
import { formatTL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";

// Full: 100mm x 30mm, 16 per A4 (2 cols x 8 rows)
// Half: 50mm x 30mm, 36 per A4 (4 cols x 9 rows)
const CONFIG = {
  full: { cols: 2, perPage: 18, widthClass: "label-full" },
  half: { cols: 4, perPage: 36, widthClass: "label-half" },
};

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function PrintPreview({ type, items, onClose }) {
  const cfg = CONFIG[type];

  const priceSize = type === "full" ? "20pt" : "12pt";
  const getNameSize = () => (type === "full" ? "20pt" : "10pt");

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

    const pagesHtml = pages
      .map((page) => {
        const cells = page.map(
          (l) =>
            `<div class="label ${type}"><span class="name" style="font-size:${getNameSize(
              l.name
            )}">${esc(l.name)}</span><span class="price" style="font-size:${priceSize}">${esc(
              formatTL(l.price)
            )}</span></div>`
        );
        const rem = page.length % cols;
        if (rem !== 0) {
          for (let i = 0; i < cols - rem; i++) {
            cells.push('<div class="label empty"></div>');
          }
        }
        return `<div class="a4"><div class="grid">${cells.join("")}</div></div>`;
      })
      .join("");

    return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8">
<title>Etiket Baskı</title>
<style>
  @page { size: A4 portrait; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #fff; }
  body { font-family: "IBM Plex Sans", Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .a4 { width: 210mm; min-height: 297mm; padding: 6mm 4mm; page-break-after: always; }
  .a4:last-child { page-break-after: auto; }
  .grid { display: grid; grid-template-columns: repeat(${cols}, ${colW}); grid-auto-rows: 30mm; justify-content: center; border-right: 3px solid #000; border-bottom: 3px solid #000; }
  .label { width: ${colW}; height: 30mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; overflow: hidden; padding: 1mm 2mm; border-top: 3px solid #000; border-left: 3px solid #000; page-break-inside: avoid; color: #000; }
  .name { font-weight: 700; line-height: 1.15; display: -webkit-box; -webkit-line-clamp: ${isFull ? 2 : 3}; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; word-break: break-word; max-width: 100%; }
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
            {type === "full" ? "· 100×30mm · 18/sayfa" : "· 50×30mm · 36/sayfa"}
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
        {pages.map((page, pi) => {
          const rem = page.length % cfg.cols;
          const fillers = rem === 0 ? 0 : cfg.cols - rem;
          return (
            <div key={pi} className="a4-page">
              <div className={`label-grid ${type === "full" ? "grid-full" : "grid-half"}`}>
                {page.map((label, li) => (
                  <div key={li} className={`label ${cfg.widthClass}`} data-testid="print-label">
                    <span className="label-name" style={{ fontSize: getNameSize(label.name) }}>
                      {label.name}
                    </span>
                    <span className="label-price" style={{ fontSize: priceSize }}>
                      {formatTL(label.price)}
                    </span>
                  </div>
                ))}
                {Array.from({ length: fillers }).map((_, fi) => (
                  <div key={`f${fi}`} className={`label ${cfg.widthClass}`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
