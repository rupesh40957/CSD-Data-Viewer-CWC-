# CSD Data Viewer (CWC)

**Hydrometeorological & Industrial AWS Telemetry Viewer**

A web-based telemetry data viewer for CSD custom binary formats. Built for Central Water Commission (CWC) hydrometeorological and industrial Automatic Weather Station (AWS) data analysis.

## Features

- 📊 **Dashboard Overview** — Station hierarchy, sensor matrix, data quality summary
- 📋 **Data Table** — Filterable & sortable telemetry records with Excel/CSV export
- 📈 **Charts & Trends** — Interactive time-series visualizations
- 🔍 **Raw Telemetry Inspector** — Hex & decoded packet-level inspection
- 🗂️ **Station Hierarchy** — Tree-based station explorer with master data mapping
- 🎨 **Dark/Light Theme** — Premium UI with MongoDB Atlas-inspired sidebar
- 📂 **File & Folder Import** — Upload `.csd` files or browse local directories

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **TypeScript**
- **Zustand** (State Management)
- **Lucide React** (Icons)
- **SheetJS (xlsx)** (Excel export & station master parsing)

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Developed by

[BackCoding](https://backcoding.in)
