class BlockEditor {
    constructor(container, jsonInput, initialBlocks = [], storageBaseUrl = "/static/uploads/", titleInput = null) {
        this.container = container;
        this.jsonInput = jsonInput;
        this.storageBase = storageBaseUrl;
        this.titleInput = titleInput;
        this.blocks = initialBlocks.map((b, i) => ({
            ...b,
            key: b.key || `k${i}`,
        }));
        this.nextKey = this.blocks.length;
        this.render();
    }

    generateKey() {
        return `k${this.nextKey++}`;
    }

    slugify(text) {
        return (text || "").toLowerCase().trim()
            .replace(/[^\w\s-]/g, "")
            .replace(/[\s-]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    addBlock(type) {
        const key = this.generateKey();
        const block = { type, key };
        switch (type) {
            case "heading":
                block.text = "";
                break;
            case "paragraph":
                block.text = "";
                break;
            case "single_image":
                block.filename = "";
                block.caption = "";
                break;
            case "image_text":
                block.filename = "";
                block.text = "";
                break;
            case "triple_image":
                block.images = [
                    { filename: "", caption: "" },
                    { filename: "", caption: "" },
                    { filename: "", caption: "" },
                ];
                break;
        }
        this.blocks.push(block);
        this.render();
        const last = this.container.lastElementChild;
        if (last) last.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    removeBlock(index) {
        this.blocks.splice(index, 1);
        this.render();
    }

    moveBlock(index, direction) {
        const target = index + direction;
        if (target < 0 || target >= this.blocks.length) return;
        const [block] = this.blocks.splice(index, 1);
        this.blocks.splice(target, 0, block);
        this.render();
    }

    updateField(index, field, value) {
        const parts = field.split(".");
        let obj = this.blocks[index];
        for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]];
        obj[parts[parts.length - 1]] = value;
        this.syncJson();
    }

    async uploadImage(index, file, field) {
        const folder = this.titleInput ? this.slugify(this.titleInput.value) : "uploads";
        const ext = file.name.split(".").pop().toLowerCase();
        const path = `${folder}/${crypto.randomUUID()}.${ext}`;

        try {
            const { data, error } = await db.storage
                .from(STORAGE_BUCKET)
                .upload(path, file, { contentType: file.type });

            if (error) {
                alert("Upload failed: " + error.message);
                return;
            }

            this.updateField(index, field, path);
            this.render();
        } catch (err) {
            alert("Upload failed. Please try again.");
        }
    }

    syncJson() {
        this.jsonInput.value = JSON.stringify(this.blocks);
    }

    render() {
        this.syncJson();
        this.container.innerHTML = "";
        if (this.blocks.length === 0) {
            const empty = document.createElement("p");
            empty.className = "block-editor__empty";
            empty.textContent =
                "No content blocks yet. Use the buttons above to add content.";
            this.container.appendChild(empty);
            return;
        }
        this.blocks.forEach((block, i) => {
            this.container.appendChild(this.renderBlock(block, i));
        });
    }

    renderBlock(block, index) {
        const card = document.createElement("div");
        card.className = `block-card block-card--${block.type}`;

        const labels = {
            heading: "Heading",
            paragraph: "Paragraph",
            single_image: "Image",
            image_text: "Image + Description",
            triple_image: "Three Images",
        };

        const header = document.createElement("div");
        header.className = "block-card__header";
        header.innerHTML = `
            <span class="block-card__type">${labels[block.type] || block.type}</span>
            <div class="block-card__actions">
                <button type="button" class="block-card__btn" title="Move up" ${index === 0 ? "disabled" : ""}>&#8593;</button>
                <button type="button" class="block-card__btn" title="Move down" ${index === this.blocks.length - 1 ? "disabled" : ""}>&#8595;</button>
                <button type="button" class="block-card__btn block-card__btn--delete" title="Remove">&times;</button>
            </div>`;
        const btns = header.querySelectorAll("button");
        btns[0].addEventListener("click", () => this.moveBlock(index, -1));
        btns[1].addEventListener("click", () => this.moveBlock(index, 1));
        btns[2].addEventListener("click", async () => {
            const ok =
                typeof confirmDialog === "function"
                    ? await confirmDialog({
                          title: "Remove this block?",
                          message:
                              "This content block will be removed from the article. This only applies after you save.",
                          confirmText: "Remove",
                          cancelText: "Cancel",
                          danger: true,
                      })
                    : confirm("Remove this block?");
            if (ok) this.removeBlock(index);
        });
        card.appendChild(header);

        const body = document.createElement("div");
        body.className = "block-card__body";

        switch (block.type) {
            case "heading":
                body.appendChild(
                    this.makeInput(block.text, "Heading text", (v) =>
                        this.updateField(index, "text", v)
                    )
                );
                break;

            case "paragraph":
                body.appendChild(
                    this.makeTextarea(block.text, "Paragraph text…", 5, (v) =>
                        this.updateField(index, "text", v)
                    )
                );
                break;

            case "single_image":
                body.appendChild(this.makeImageSlot(index, "filename", block.filename));
                body.appendChild(
                    this.makeInput(block.caption, "Caption (optional)", (v) =>
                        this.updateField(index, "caption", v), "block-input--caption"
                    )
                );
                break;

            case "image_text":
                body.appendChild(this.makeImageSlot(index, "filename", block.filename));
                body.appendChild(
                    this.makeTextarea(block.text, "Image description…", 3, (v) =>
                        this.updateField(index, "text", v)
                    )
                );
                break;

            case "triple_image": {
                const row = document.createElement("div");
                row.className = "block-triple-row";
                (block.images || []).forEach((img, j) => {
                    const slot = document.createElement("div");
                    slot.className = "block-triple-slot";
                    slot.appendChild(
                        this.makeImageSlot(index, `images.${j}.filename`, img.filename, `Image ${j + 1}`)
                    );
                    slot.appendChild(
                        this.makeInput(img.caption, `Caption ${j + 1}`, (v) =>
                            this.updateField(index, `images.${j}.caption`, v), "block-input--caption"
                        )
                    );
                    row.appendChild(slot);
                });
                body.appendChild(row);
                break;
            }
        }

        card.appendChild(body);
        return card;
    }

    makeInput(value, placeholder, onChange, extraClass = "") {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "block-input" + (extraClass ? ` ${extraClass}` : "");
        input.placeholder = placeholder;
        input.value = value || "";
        input.addEventListener("input", (e) => onChange(e.target.value));
        return input;
    }

    makeTextarea(value, placeholder, rows, onChange) {
        const ta = document.createElement("textarea");
        ta.className = "block-textarea";
        ta.placeholder = placeholder;
        ta.rows = rows;
        ta.value = value || "";
        ta.addEventListener("input", (e) => onChange(e.target.value));
        return ta;
    }

    makeImageSlot(blockIndex, field, currentFilename, label = "Image") {
        const wrap = document.createElement("div");
        wrap.className = "block-image-slot";

        if (currentFilename) {
            wrap.innerHTML = `
                <div class="block-image-preview">
                    <img src="${this.storageBase}${this.esc(currentFilename)}" alt="">
                    <button type="button" class="block-image-remove" title="Remove image">&times;</button>
                </div>`;
            wrap.querySelector(".block-image-remove").addEventListener("click", () => {
                this.updateField(blockIndex, field, "");
                this.render();
            });
        } else {
            const area = document.createElement("div");
            area.className = "block-image-upload";
            area.innerHTML = `<p>${this.esc(label)} &mdash; click or drag to upload</p>`;
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = "image/*";
            fileInput.style.display = "none";
            area.appendChild(fileInput);

            area.addEventListener("click", (e) => {
                if (e.target !== fileInput) fileInput.click();
            });
            area.addEventListener("dragover", (e) => {
                e.preventDefault();
                area.classList.add("dragover");
            });
            area.addEventListener("dragleave", () =>
                area.classList.remove("dragover")
            );
            area.addEventListener("drop", (e) => {
                e.preventDefault();
                area.classList.remove("dragover");
                if (e.dataTransfer.files[0])
                    this.uploadImage(blockIndex, e.dataTransfer.files[0], field);
            });
            fileInput.addEventListener("change", () => {
                if (fileInput.files[0])
                    this.uploadImage(blockIndex, fileInput.files[0], field);
            });
            wrap.appendChild(area);
        }

        return wrap;
    }

    esc(str) {
        const d = document.createElement("div");
        d.textContent = str || "";
        return d.innerHTML;
    }
}
