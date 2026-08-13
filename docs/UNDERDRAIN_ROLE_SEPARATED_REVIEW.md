# UNDERDRAIN role-separated review

Windows software review uses four isolated functions: player, observer, adjudicator, and acceptor. Each function carries a distinct seat identifier, lineage identifier, and context digest. The player and observer receive no source, rubric, or answer key. The adjudicator receives only the immutable observation packet and the versioned contract. The acceptor receives the completed evidence packet and cannot modify the reviewed artifact.

This review concerns the Windows software product. Device installation and room qualification remain separate evidence planes. The runtime and candidate author cannot issue comprehension or product acceptance.
