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

  const doPrint = () => window.print();

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
