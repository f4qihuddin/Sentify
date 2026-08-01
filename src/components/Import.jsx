import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import ActionButton from "./ActionButton";
import FileButton from "./FileButton";

function Import({ onImport }) {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [error, setError] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  function handleFileSelect(file) {
    setSelectedFile(file);
    setColumns([]);
    setPreviewData([]);
    setError("");
    setIsParsing(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,

      complete(results) {
        if (results.errors.length > 0) {
          setError(results.errors[0].message);
          setIsParsing(false);
          return;
        }

        setColumns(results.meta.fields ?? []);
        setPreviewData(results.data.slice(0, 100));
        setIsParsing(false);
      },

      error(parseError) {
        setError(parseError.message);
        setIsParsing(false);
      },
    });
  }

  function handleImport() {
    if (!selectedFile || error || isParsing || columns.length === 0) {
      return;
    }

    onImport?.(selectedFile);
    navigate("/");
  }

  const canImport =
    Boolean(selectedFile) &&
    !error &&
    !isParsing &&
    columns.length > 0;

  return (
    <div className="import-container">
      <div className="import-file-preview">
        {!selectedFile && (
          <>
            <img src="/src/assets/file.svg" alt="" />
            <p>File Preview Appear Here</p>
          </>
        )}

        {error && <p className="csv-error">{error}</p>}

        {selectedFile && !error && (
          <>
            <p>{selectedFile.name}</p>

            <div className="csv-table-wrapper">
              <table className="csv-table">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {previewData.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {columns.map((column) => (
                        <td key={`${rowIndex}-${column}`}>
                          {row[column] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="button-container">
        <FileButton
          logo="/src/assets/attach file.svg"
          label="Choose File"
          accept=".csv,text/csv"
          onFileSelect={handleFileSelect}
        />

        <ActionButton
          logo="/src/assets/import.svg"
          label="Import"
          action={handleImport}
          state={canImport}
        />
      </div>
    </div>
  );
}

export default Import;
