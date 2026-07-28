import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ProductDialog({ open, onOpenChange, initial, onSave }) {
  const isEdit = Boolean(initial?.id);
  const [name, setName] = useState(initial?.name || "");
  const [price, setPrice] = useState(initial?.price ?? "");
  const [stock, setStock] = useState(initial?.stock ?? 0);
  const [sku, setSku] = useState(initial?.sku || "");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave({
      name: name.trim(),
      price: parseFloat(price) || 0,
      stock: parseInt(stock) || 0,
      sku: sku.trim(),
    });
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="product-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading tracking-tight">
            {isEdit ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="p-name">Ürün Adı</Label>
            <Input
              id="p-name"
              data-testid="product-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="p-price">Fiyat (₺)</Label>
              <Input
                id="p-price"
                data-testid="product-price-input"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-stock">Stok</Label>
              <Input
                id="p-stock"
                data-testid="product-stock-input"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-sku">Ürün Kodu (opsiyonel)</Label>
            <Input
              id="p-sku"
              data-testid="product-sku-input"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="product-cancel-button"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#4338CA] hover:bg-[#3730A3]"
              data-testid="product-save-button"
            >
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
