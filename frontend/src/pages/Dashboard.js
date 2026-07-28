import { useEffect, useMemo, useRef, useState } from "react";
import { api, formatApiError, formatTL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Store,
  Plus,
  Search,
  Upload,
  Printer,
  Pencil,
  Trash2,
  LogOut,
  Package,
  Tag,
} from "lucide-react";
import ProductDialog from "@/components/ProductDialog";
import PrintPreview from "@/components/PrintPreview";

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState({}); // id -> qty
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [printType, setPrintType] = useState(null); // 'full' | 'half' | null
  const fileRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/products");
      setProducts(data);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q)
    );
  }, [products, search]);

  const selectedIds = Object.keys(selected);
  const allSelected = filtered.length > 0 && filtered.every((p) => selected[p.id]);

  const toggleAll = () => {
    if (allSelected) {
      const next = { ...selected };
      filtered.forEach((p) => delete next[p.id]);
      setSelected(next);
    } else {
      const next = { ...selected };
      filtered.forEach((p) => {
        if (!next[p.id]) next[p.id] = 1;
      });
      setSelected(next);
    }
  };

  const toggleOne = (id) => {
    const next = { ...selected };
    if (next[id]) delete next[id];
    else next[id] = 1;
    setSelected(next);
  };

  const setQty = (id, qty) => {
    setSelected((s) => ({ ...s, [id]: Math.max(1, parseInt(qty) || 1) }));
  };

  const saveProduct = async (payload) => {
    try {
      if (editing?.id) {
        await api.put(`/products/${editing.id}`, payload);
        toast.success("Ürün güncellendi");
      } else {
        await api.post("/products", payload);
        toast.success("Ürün eklendi");
      }
      setDialogOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/products/${deleteTarget.id}`);
      toast.success("Ürün silindi");
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const onImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const { data } = await api.post("/products/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(`${data.inserted} ürün içe aktarıldı`);
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const buildPrintItems = () =>
    selectedIds
      .map((id) => {
        const p = products.find((x) => x.id === id);
        return p ? { name: p.name, price: p.price, qty: selected[id] } : null;
      })
      .filter(Boolean);

  const openPrint = (type) => {
    if (selectedIds.length === 0) {
      toast.error("Lütfen en az bir ürün seçin");
      return;
    }
    setPrintType(type);
  };

  const totalLabels = selectedIds.reduce((sum, id) => sum + (selected[id] || 1), 0);

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Top bar */}
      <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-20 no-print">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-[#4338CA] flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-heading font-bold tracking-tight text-[#111827]">
              Dükkanım
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#6B7280] hidden sm:inline">{user?.email}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              data-testid="logout-button"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Çıkış
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-8 no-print">
        {/* Stat row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-[#E5E7EB] rounded-md p-5">
            <div className="flex items-center gap-2 text-[#6B7280] text-sm">
              <Package className="w-4 h-4" /> Toplam Ürün
            </div>
            <p className="text-3xl font-mono font-semibold text-[#111827] mt-2">
              {products.length}
            </p>
          </div>
          <div className="bg-white border border-[#E5E7EB] rounded-md p-5">
            <div className="flex items-center gap-2 text-[#6B7280] text-sm">
              <Tag className="w-4 h-4" /> Seçili Ürün
            </div>
            <p className="text-3xl font-mono font-semibold text-[#4338CA] mt-2">
              {selectedIds.length}
            </p>
          </div>
          <div className="bg-white border border-[#E5E7EB] rounded-md p-5">
            <div className="flex items-center gap-2 text-[#6B7280] text-sm">
              <Printer className="w-4 h-4" /> Basılacak Etiket
            </div>
            <p className="text-3xl font-mono font-semibold text-[#059669] mt-2">
              {totalLabels}
            </p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
            <Input
              data-testid="search-input"
              placeholder="Ürün adı veya kodu ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              onChange={onImport}
              className="hidden"
              data-testid="import-file-input"
            />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              data-testid="import-button"
            >
              <Upload className="w-4 h-4 mr-2" />
              CSV İçe Aktar
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              className="bg-[#4338CA] hover:bg-[#3730A3]"
              data-testid="add-product-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ürün Ekle
            </Button>
          </div>
        </div>

        {/* Bulk print bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-white border border-[#E5E7EB] rounded-md">
          <span className="text-sm text-[#6B7280]">Toplu Etiket Bas:</span>
          <Button
            onClick={() => openPrint("full")}
            className="bg-[#059669] hover:bg-[#047857]"
            data-testid="print-full-button"
          >
            <Printer className="w-4 h-4 mr-2" />
            Tam Etiket (100×30mm)
          </Button>
          <Button
            onClick={() => openPrint("half")}
            variant="outline"
            className="border-[#059669] text-[#059669] hover:bg-[#059669]/5"
            data-testid="print-half-button"
          >
            <Printer className="w-4 h-4 mr-2" />
            Yarım Etiket (50×30mm)
          </Button>
        </div>

        {/* Table */}
        <div className="bg-white border border-[#E5E7EB] rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F8F9FA] hover:bg-[#F8F9FA]">
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    data-testid="select-all-checkbox"
                  />
                </TableHead>
                <TableHead>Ürün Adı</TableHead>
                <TableHead>Kod</TableHead>
                <TableHead className="text-right">Fiyat</TableHead>
                <TableHead className="text-right">Stok</TableHead>
                <TableHead className="w-28 text-center">Etiket Adedi</TableHead>
                <TableHead className="w-24 text-right">İşlem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-[#6B7280]">
                    Yükleniyor…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-[#6B7280]">
                    Ürün bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const isSel = Boolean(selected[p.id]);
                  return (
                    <TableRow
                      key={p.id}
                      data-testid={`product-row-${p.id}`}
                      className={isSel ? "bg-[#4338CA]/5" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSel}
                          onCheckedChange={() => toggleOne(p.id)}
                          data-testid={`select-checkbox-${p.id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-[#111827]">{p.name}</TableCell>
                      <TableCell className="font-mono text-xs text-[#6B7280]">
                        {p.sku || "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[#111827]">
                        {formatTL(p.price)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-[#6B7280]">
                        {p.stock}
                      </TableCell>
                      <TableCell className="text-center">
                        {isSel ? (
                          <Input
                            type="number"
                            min="1"
                            value={selected[p.id]}
                            onChange={(e) => setQty(p.id, e.target.value)}
                            className="w-16 h-8 mx-auto text-center font-mono"
                            data-testid={`qty-input-${p.id}`}
                          />
                        ) : (
                          <span className="text-[#E5E7EB]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditing(p);
                              setDialogOpen(true);
                            }}
                            data-testid={`edit-button-${p.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-[#DC2626] hover:text-[#DC2626]"
                            onClick={() => setDeleteTarget(p)}
                            data-testid={`delete-button-${p.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {dialogOpen && (
        <ProductDialog
          key={editing?.id || "new"}
          open={dialogOpen}
          onOpenChange={(o) => {
            setDialogOpen(o);
            if (!o) setEditing(null);
          }}
          initial={editing}
          onSave={saveProduct}
        />
      )}

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent data-testid="delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Ürünü sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">{deleteTarget?.name}</span> kalıcı olarak silinecek.
              Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="delete-cancel-button">İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-[#DC2626] hover:bg-[#B91C1C]"
              data-testid="delete-confirm-button"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {printType && (
        <PrintPreview
          type={printType}
          items={buildPrintItems()}
          onClose={() => setPrintType(null)}
        />
      )}
    </div>
  );
}
