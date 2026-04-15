from fastapi.staticfiles import StaticFiles

# Serve static assets (JS, CSS etc from Vite build)
dist_path = Path(__file__).resolve().parent.parent / "client" / "dist"
app.mount("/assets", StaticFiles(directory=dist_path / "assets"), name="assets")

@app.get("/")
async def root():
    index_file = dist_path / "index.html"
    with open(index_file) as f:
        return HTMLResponse(f.read())

# Catch all routes for React Router
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    index_file = dist_path / "index.html"
    with open(index_file) as f:
        return HTMLResponse(f.read())
