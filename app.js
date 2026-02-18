const fileInput = document.getElementById("file-input");
const uploadBtn = document.getElementById("upload-btn");
const form = document.getElementById("upload-form");
const messageArea = document.getElementById("message-area");
const fileInfo = document.getElementById("file-info");

form.addEventListener("submit", e => {
    e.preventDefault();

    const file = fileInput.files[0];
    const result = validateFile(file);

    if (!result.valid) {
        showMessage(result.error);
        return;
    }

    setLoading(true);
    showMessage("Subiendo archivo...");

    // simulación de carga
    setTimeout(() => {
        setLoading(false);
        showMessage("Archivo subido correctamente.");

        form.reset();
        fileInfo.textContent = "";
        uploadBtn.disabled = true;
        fileInput.focus();
    }, 1200);
});


function validateFile(file) {
    if (!file) {
        return { valid: false, error: "No se seleccionó ningún archivo." };
    }

    const allowedExt = ["pdf","docx","txt"];
    const ext = file.name.split(".").pop().toLowerCase();

    if (!allowedExt.includes(ext)) {
        return { valid:false, error:"Formato inválido. Solo PDF, DOCX o TXT." };
    }

    if (file.size === 0) {
        return { valid:false, error:"El archivo está vacío." };
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        return { valid:false, error:"El archivo excede 10MB." };
    }

    return { valid:true };
}

function formatSize(bytes) {
    const kb = bytes / 1024;
    const mb = kb / 1024;
    return mb >= 1
        ? mb.toFixed(2) + " MB"
        : kb.toFixed(2) + " KB";
}

function setLoading(isLoading) {
    uploadBtn.disabled = isLoading;
    uploadBtn.textContent = isLoading ? "Subiendo..." : "Subir archivo";
}

function showMessage(msg) {
    messageArea.textContent = msg;
}

fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    messageArea.textContent = "";

    if (!file) {
        uploadBtn.disabled = true;
        fileInfo.textContent = "";
        return;
    }

    const result = validateFile(file);

    if (!result.valid) {
        uploadBtn.disabled = true;
        fileInfo.textContent = "";
        showMessage(result.error);
        return;
    }

    fileInfo.textContent =
        "Archivo: " + file.name + " (" + formatSize(file.size) + ")";
    uploadBtn.disabled = false;
});


