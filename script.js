let pdfFiles = [], mergedBlobUrl = null;

const dropArea = document.getElementById("dropArea"),
    pdfInput = document.getElementById("pdfInput"),
    fileListEl = document.getElementById("fileList"),
    progressContainer = document.getElementById("progressContainer"),
    progressBar = document.getElementById("progressBar"),
    modal = document.getElementById("modal"),
    modalPdf = document.getElementById("modalPdf"),
    successAlert = document.getElementById("successAlert"),
    loadingOverlay = document.getElementById("loadingOverlay"),
    mergeBtn = document.getElementById("mergeBtn"),
    clearBtn = document.getElementById("clearBtn");

dropArea.onclick = () => pdfInput.click();
dropArea.addEventListener("dragover", e => { e.preventDefault(); dropArea.classList.add("dragover"); });
dropArea.addEventListener("dragleave", () => dropArea.classList.remove("dragover"));
dropArea.addEventListener("drop", e => { e.preventDefault(); dropArea.classList.remove("dragover"); handleFiles([...e.dataTransfer.files]); });
pdfInput.addEventListener("change", e => handleFiles([...e.target.files]));

async function handleFiles(files) {
    loadingOverlay.style.display = "flex";
    await new Promise(r => setTimeout(r, 40));
    for (const f of files) {
        if (f.type !== "application/pdf") continue;
        pdfFiles.push({ file: f, preview: URL.createObjectURL(f) });
    }
    renderList();
    pdfInput.value = "";
    loadingOverlay.style.display = "none";
}

let draggedIndex = null;
function renderList() {
    fileListEl.innerHTML = "";
    pdfFiles.forEach((item, i) => {
        const card = document.createElement("div");
        card.className = "file-card";
        card.draggable = true;
        card.dataset.index = i;
        card.innerHTML = `
            <div class="thumb" onclick="openPreview('${item.preview}')"><embed src="${item.preview}" type="application/pdf"></div>
            <div class="file-name">${item.file.name}</div>
            <button class="btn-prev" onclick="openPreview('${item.preview}')">Preview</button>
            <button class="btn-del" onclick="removeFile(${i})">Excluir</button>
        `;
        card.addEventListener("dragstart", () => { draggedIndex = i; card.classList.add("dragging"); });
        card.addEventListener("dragend", () => { card.classList.remove("dragging"); draggedIndex = null; });
        card.addEventListener("dragover", e => { e.preventDefault(); card.classList.add("over"); });
        card.addEventListener("dragleave", () => { card.classList.remove("over"); });
        card.addEventListener("drop", () => {
            card.classList.remove("over");
            if (draggedIndex === i) return;
            pdfFiles.splice(i, 0, pdfFiles.splice(draggedIndex, 1)[0]);
            renderList();
        });
        fileListEl.appendChild(card);
    });
}

function removeFile(i) { if (!pdfFiles[i]) return; URL.revokeObjectURL(pdfFiles[i].preview); pdfFiles.splice(i, 1); renderList(); }
function openPreview(url) { modalPdf.src = url; modal.style.display = "flex"; }
function closeModal() { modal.style.display = "none"; modalPdf.src = ""; }

clearBtn.addEventListener("click", () => {
    closeModal();
    pdfFiles.forEach(f => URL.revokeObjectURL(f.preview));
    pdfFiles = [];
    if (mergedBlobUrl) URL.revokeObjectURL(mergedBlobUrl);
    mergedBlobUrl = null;
    renderList();
    pdfInput.value = "";
});

mergeBtn.addEventListener("click", async () => {
    if (pdfFiles.length === 0) { alert("Adicione pelo menos 1 PDF."); return; }
    loadingOverlay.style.display = "flex";
    mergeBtn.disabled = true;
    progressContainer.style.display = "block";
    progressBar.style.width = "0%";
    try {
        const mergedPdf = await PDFLib.PDFDocument.create();
        for (let i = 0; i < pdfFiles.length; i++) {
            progressBar.style.width = ((i + 0.1) / pdfFiles.length * 100) + "%";
            const bytes = await pdfFiles[i].file.arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(bytes);
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach(p => mergedPdf.addPage(p));
            progressBar.style.width = ((i + 1) / pdfFiles.length * 100) + "%";
        }
        const blob = new Blob([await mergedPdf.save()], { type: "application/pdf" });
        if (mergedBlobUrl) URL.revokeObjectURL(mergedBlobUrl);
        mergedBlobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = mergedBlobUrl;
        a.download = document.getElementById("outputName").value;
        document.body.appendChild(a);
        a.click();
        a.remove();
        successAlert.classList.add("show");
        setTimeout(() => successAlert.classList.remove("show"), 3000);
    } catch (e) { console.error(e); alert("Ocorreu um erro ao juntar os PDFs."); }
    finally { progressContainer.style.display = "none"; loadingOverlay.style.display = "none"; mergeBtn.disabled = false; pdfInput.value = ""; }
});

window.addEventListener("beforeunload", () => { pdfFiles.forEach(f => URL.revokeObjectURL(f.preview)); if (mergedBlobUrl) URL.revokeObjectURL(mergedBlobUrl); });
