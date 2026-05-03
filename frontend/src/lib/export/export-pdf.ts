export const exportPdf = async (element: HTMLElement, filename = "bericht.pdf") => {
    try {
        const html2pdf = (await import("html2pdf.js")).default;
        html2pdf()
            .set({
                margin:      [12, 12, 12, 12],
                filename,
                html2canvas: { scale: 2, useCORS: true, backgroundColor: "#090e1a" },
                jsPDF:       { unit: "mm", format: "a4", orientation: "portrait" },
            })
            .from(element)
            .save();
    } catch (err) {
        console.error("PDF-Export fehlgeschlagen:", err);
    }
};
