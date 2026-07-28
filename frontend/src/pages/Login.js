import { useState } from "react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Store, Loader2 } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [mode, setMode] = useState("login"); // 'login' | 'register'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("admin@dukkanim.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const path = isRegister ? "/auth/register" : "/auth/login";
      const payload = isRegister ? { name, email, password } : { email, password };
      const { data } = await api.post(path, payload);
      login(data.token, data.user);
      toast.success(isRegister ? "Kayıt başarılı" : "Giriş başarılı");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(isRegister ? "login" : "register");
    setPassword("");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F8F9FA]">
      {/* Form side */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10">
            <div className="w-10 h-10 rounded-md bg-[#4338CA] flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-heading font-bold tracking-tight text-[#111827]">
              Dükkanım
            </span>
          </div>

          <h1 className="text-3xl font-heading font-bold tracking-tight text-[#111827]">
            {isRegister ? "Hesap oluştur" : "Tekrar hoş geldiniz"}
          </h1>
          <p className="text-sm text-[#6B7280] mt-2 mb-8">
            {isRegister
              ? "Ürünlerinizi yönetmek için yeni bir hesap açın."
              : "Ürünlerinizi yönetmek ve etiket basmak için giriş yapın."}
          </p>

          <form onSubmit={submit} className="space-y-5" data-testid="login-form">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name">Ad Soyad / Dükkan Adı</Label>
                <Input
                  id="name"
                  data-testid="register-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn. Ahmet / Market ABC"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                data-testid="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@dukkan.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
              {isRegister && (
                <p className="text-xs text-[#6B7280]">En az 6 karakter.</p>
              )}
            </div>
            <Button
              type="submit"
              data-testid="login-submit-button"
              disabled={loading}
              className="w-full bg-[#4338CA] hover:bg-[#3730A3] h-11"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isRegister ? "Kayıt Ol" : "Giriş Yap"}
            </Button>
          </form>

          <p className="text-sm text-[#6B7280] mt-6">
            {isRegister ? "Zaten hesabınız var mı? " : "Hesabınız yok mu? "}
            <button
              type="button"
              onClick={switchMode}
              data-testid="toggle-auth-mode-button"
              className="font-medium text-[#4338CA] hover:text-[#3730A3] underline underline-offset-2"
            >
              {isRegister ? "Giriş yapın" : "Kayıt olun"}
            </button>
          </p>
        </div>
      </div>

      {/* Image side */}
      <div className="hidden lg:block relative">
        <img
          src="https://images.pexels.com/photos/5531709/pexels-photo-5531709.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          alt="Mağaza"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#111827]/30" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <p className="text-2xl font-heading font-semibold tracking-tight max-w-md">
            Ürün takibi ve etiket baskısı, tek panelde.
          </p>
        </div>
      </div>
    </div>
  );
}
