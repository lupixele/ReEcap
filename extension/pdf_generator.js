// Executes in the MAIN WORLD to bypass MV3 Isolated World restrictions,
// enabling access to window.jspdf and the dynamically rendered canvases.

(function() {
  function generate() {
    try {
      const btn = document.getElementById("reecap-save-pdf");
      if (btn) {
        btn.dataset.originalText = btn.innerHTML;
        btn.innerHTML = "Generating PDF...";
        btn.style.pointerEvents = "none";
      }

      if (!window.jspdf) {
        throw new Error("jsPDF engine not loaded.");
      }
      
      const { jsPDF } = window.jspdf;
      const canvases = document.querySelectorAll("#pdf_viewer canvas");
      const validCanvases = Array.from(canvases).filter(c => c.width > 0 && c.height > 0);
      
      if (!validCanvases.length) {
        alert("The exam paper has not finished rendering. Please wait and try again.");
        restoreButton(btn);
        return;
      }

      const firstCanvas = validCanvases[0];
      const pdf = new jsPDF({
        orientation: firstCanvas.width > firstCanvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [firstCanvas.width, firstCanvas.height],
        hotfixes: ["px_scaling"]
      });

      validCanvases.forEach((canvas, i) => {
        if (i > 0) {
          pdf.addPage(
            [canvas.width, canvas.height],
            canvas.width > canvas.height ? "landscape" : "portrait"
          );
        }
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
      });

      const activeBtn = document.querySelector("#div_scripts a.active");
      const subjectCode = activeBtn ? activeBtn.textContent.trim() : "exam";
      pdf.save(`${subjectCode}_answer_sheet.pdf`);

      restoreButton(btn);
    } catch (err) {
      console.error("ReEcap: Failed to generate PDF", err);
      alert("Could not generate PDF. Please check the console for details.");
      const btn = document.getElementById("reecap-save-pdf");
      restoreButton(btn);
    }
  }

  function restoreButton(btn) {
    if (btn && btn.dataset.originalText) {
      btn.innerHTML = btn.dataset.originalText;
      btn.style.pointerEvents = "auto";
    }
  }

  generate();
})();

