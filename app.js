:root {
  color-scheme: light dark;
  font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #f2f4f8;
  color: #18202b;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

.app {
  width: min(1100px, calc(100% - 32px));
  margin: 32px auto;
  display: grid;
  gap: 18px;
}

.card {
  background: #ffffff;
  border: 1px solid #d9e1ec;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(27, 39, 57, 0.08);
}

.hero {
  background: linear-gradient(135deg, #eef5ff, #ffffff);
}

h1,
h2 {
  margin-top: 0;
}

.row,
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

input {
  min-width: min(100%, 360px);
  flex: 1;
  padding: 12px 14px;
  border: 1px solid #b7c4d6;
  border-radius: 10px;
  font-size: 16px;
}

button {
  border: 0;
  border-radius: 10px;
  padding: 12px 16px;
  background: #1d65d8;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

button:hover {
  filter: brightness(0.95);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.secondary {
  background: #536273;
}

.danger {
  background: #c83232;
}

.hint,
.muted {
  color: #657386;
}

.list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.item {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid #d9e1ec;
  border-radius: 12px;
  background: #fbfcff;
}

.item-main {
  overflow-wrap: anywhere;
}

.item-title {
  font-weight: 700;
}

.item-subtitle {
  color: #657386;
  font-size: 14px;
  margin-top: 4px;
}

.status {
  padding: 12px;
  border: 1px dashed #aab7c8;
  border-radius: 12px;
  background: #fbfcff;
}

.status.error {
  border-color: #d94141;
  color: #a41d1d;
  background: #fff4f4;
}

.status.success {
  border-color: #1c9150;
  color: #146a3a;
  background: #f0fff6;
}

progress {
  width: 100%;
  height: 22px;
  margin-top: 12px;
}

.viewer {
  min-height: 240px;
  max-height: 560px;
  overflow: auto;
  margin: 12px 0 0;
  padding: 14px;
  border: 1px solid #d9e1ec;
  border-radius: 12px;
  background: #0f1720;
  color: #edf5ff;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (prefers-color-scheme: dark) {
  :root {
    background: #10161f;
    color: #edf5ff;
  }

  .card,
  .item,
  .status {
    background: #162030;
    border-color: #2f4158;
  }

  .hero {
    background: linear-gradient(135deg, #16263f, #162030);
  }

  input {
    background: #10161f;
    border-color: #40556f;
    color: #edf5ff;
  }
}
