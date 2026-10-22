# Amino Lab

A browser-based practice app for the 20 standard amino acids: names, codes,
structures, side-chain groups, drawing, molecule assembly, and recall.

## Use

Open [Amino Lab](https://sushihex.github.io/amino-lab/). This is a static site:
there is no server application, sign-in, database, or build step.

Study progress is saved in the current browser, not in this repository. To move
progress between devices or website addresses, use **Progress → Export backup**,
then **Progress → Import backup** on the destination. Import requires confirmation
and replaces that browser's existing progress. Keep backup files private; do not
commit them here. Browser or school policies may prevent local saving.

For local development, serve this folder with any static web server, for example
`python3 -m http.server 8000`, then open `http://localhost:8000`.

## Educational sources

The app retains its **Accuracy & sources** links and contextual source references.
Chemical structures and learning explanations draw on these references:

- [IUPAC amino-acid symbols](https://iupac.qmul.ac.uk/AminoAcid/A2021.html)
- [OpenStax Organic Chemistry: Structures of Amino Acids](https://openstax.org/books/organic-chemistry/pages/26-1-structures-of-amino-acids)
- [EMBL-EBI: General amino-acid structure](https://www.ebi.ac.uk/training/online/courses/foundations-protein-structure/fundamentals-of-protein-composition/the-building-blocks-amino-acids/general-structure/)
- [PubChem](https://pubchem.ncbi.nlm.nih.gov/) and [ChEBI](https://www.ebi.ac.uk/chebi/)

Neutral teaching structures and simplified categories do not represent every
pH-dependent charge state or stereochemical detail. The app is a study aid, not
an official examination mark scheme.

## License

The original application code and accompanying original assets are available
under the [MIT License](LICENSE). Linked third-party publications and source
materials retain their own copyright and licensing terms; this repository's
license does not relicense them.
