import docx

def create_showcase_file():
    doc = docx.Document()

    # Plain unformatted paragraphs (Normal style)
    doc.add_paragraph("Automated Offline Manuscript Typography and Structural Analysis System")
    doc.add_paragraph("Dr. Aris Thorne, Jane Doe, and Michael R. Zhang")
    doc.add_paragraph("Department of Computer Science, University of Technology")
    
    doc.add_paragraph(
        "Abstract—Manual document styling is tedious and error-prone. "
        "This paper proposes an offline machine learning parser to classify document "
        "elements and format them deterministically across standardized publication profiles."
    )
    
    doc.add_paragraph("Keywords: natural language processing, document formatting, offline classification, python-docx")
    
    doc.add_paragraph("CHAPTER 1 INTRODUCTION")
    
    doc.add_paragraph("1.0 Background and Problem Motivation")
    doc.add_paragraph(
        "Document processing systems require reliable pipelines that can operate offline "
        "without external cloud dependencies. In enterprise environments, manuscript styling consistency is critical."
    )
    
    doc.add_paragraph("1.1 Feature Extraction and Structural Signals")
    doc.add_paragraph(
        "We extract sub-word character n-grams and vocabulary frequency to determine layout roles "
        "without altering underlying paragraph contents."
    )
    
    doc.add_paragraph("1.1.1 Character N-Gram Calibration")
    doc.add_paragraph(
        "Character n-grams provide robustness against typographic anomalies and assist in distinguishing "
        "numbered headings from typical body sentences."
    )
    
    doc.add_paragraph("Figure 1: High-level architectural pipeline of DocuForge AI.")
    
    doc.add_paragraph(
        "\"Simplicity is prerequisite for reliability; software complexity inevitably breeds vulnerability.\" "
        "— Edsger W. Dijkstra"
    )
    
    doc.add_paragraph("CHAPTER 2 METHODOLOGY AND EVALUATION")
    
    doc.add_paragraph("2.0 Proposed Document Processing Methodology")
    doc.add_paragraph(
        "We evaluate memory consumption across chunk sizes ranging from 50 to 500 paragraphs "
        "to prevent latency bottlenecks on standard consumer hardware."
    )
    
    doc.add_paragraph("Table 2: Comparison of macro-averaged F1 scores across classification baselines.")
    
    doc.add_paragraph("[1] J. Smith and A. Doe, \"Linear classification paradigms for complex documents,\" IEEE Trans., 2021.")
    doc.add_paragraph("[2] R. K. Vance et al., \"DocBank: A Benchmark Dataset for Document Layout Analysis,\" arXiv:2006.01038, 2020.")
    doc.add_paragraph("[3] L. Breiman, \"Random Forests,\" Machine Learning, vol. 45, no. 1, pp. 5-32, 2001.")

    output_path = "demo_showcase.docx"
    doc.save(output_path)
    print(f"File created successfully: {output_path}")

if __name__ == "__main__":
    create_showcase_file()