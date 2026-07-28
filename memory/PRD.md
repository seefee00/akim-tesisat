# Dükkanım — Ürün Takibi & Etiket Baskı

## Original Problem Statement
Turkish shop owner: product tracking + label printing. Labels split into Full (Tam) and Half (Yarım). Bulk print button. Full label = 100mm wide × 30mm tall, 16 per A4 (2×8). Half label = 50mm wide × 30mm tall, 36 per A4 (4×9). Labels show product name + price only. Turkish UI, Turkish Lira.

## Architecture
- Backend: FastAPI + MongoDB (motor). JWT (Bearer token in localStorage) auth.
- Frontend: React (CRA/craco) + Tailwind + shadcn/ui + sonner.
- Print: pure HTML/CSS A4 layout with `@media print` and exact mm measurements.

## User Personas
- Shop owner (admin) — single account, manages products and prints labels.

## Core Requirements (static)
- Username/password login (JWT).
- Product CRUD + CSV import.
- Bulk label printing in two exact sizes (Full 100×30mm / Half 50×30mm) with per-product quantity.

## Implemented (2026-07-28)
- JWT login (admin@dukkanim.com / admin123), auth-protected product endpoints.
- Product table: add, edit, delete, search, seeded sample products.
- CSV import (columns: name/ürün adı, price/fiyat, stock/stok, sku/kod).
- Checkbox selection + select-all + per-product "Etiket Adedi" quantity.
- Bulk print preview for Tam (16/A4, 2×8) and Yarım (36/A4, 4×9) with correct mm sizing; window.print() outputs clean A4.
- Turkish UI, ₺ formatting (tr-TR).

## Backlog
- P1: Excel (.xlsx) import in addition to CSV.
- P1: Optional shop logo / configurable label fields.
- P2: Categories, low-stock alerts, price history.
- P2: Downloadable CSV template + export.

## Next Tasks
- Await user feedback on label layout/print output on real A4.
