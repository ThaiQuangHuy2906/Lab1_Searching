# Third-party materials and data

The root [`LICENSE`](LICENSE) applies only to original source code and
documentation created by the named copyright holders, unless a file states
otherwise. It does not replace or override the licenses, terms, attribution
requirements, or ownership of third-party materials.

## OpenStreetMap

OpenStreetMap data and databases derived from it are not relicensed under MIT.
OpenStreetMap data is available under the Open Data Commons Open Database
License (ODbL) and requires attribution to OpenStreetMap and its contributors.

- Copyright and license: <https://www.openstreetmap.org/copyright>
- Relevant repository locations include the OSM/OSMnx artifacts and graph
  snapshots under `data/`.

## TomTom

TomTom API content, including traffic data and stored API responses, is not
relicensed under MIT. It remains subject to the applicable TomTom agreement and
product terms.

- Developer terms: <https://developer.tomtom.com/terms-and-conditions>
- Relevant repository locations include `data/raw/tomtom/` and traffic profiles
  containing `tomtom+synthetic` data.

## Other excluded material

Unless a file contains a separate license notice, the MIT grant does not cover:

- `data/` and `results/`, except for original source text or code explicitly
  identified as MIT-licensed;
- basemap tiles, map imagery and screenshots containing third-party map content,
  including material under `artifacts/readme/`;
- course assignment/reference PDFs and other third-party documents;
- third-party figures, fonts, icons, libraries, packages and assets.

Third-party dependencies retain their own licenses even when referenced by a
lockfile or installed to run this project. Distribution or use of a combined
copy must comply with the MIT License and every applicable third-party license
or term.
