import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../api';
import { PageHeader } from '../components/ui';

const COLUMNS = [
  ['Date', 'required', 'YYYY-MM-DD or DD/MM/YYYY, or an Excel date'],
  ['Amount', 'required', 'A number; ₹ and commas are fine'],
  ['Category', 'required', 'Must match a category in Settings'],
  ['Payment Mode', 'optional', 'Must match Settings if given'],
  ['Reimbursement Type', 'optional', 'Must match Settings if given'],
  ['Tax Applicable', 'optional', 'Yes or No (blank means No)'],
  ['Description', 'optional', 'Up to 1000 characters'],
  ['Status', 'optional', 'Blank means Pending Review'],
];

/** Bulk import from an Excel sheet, e.g. the spreadsheet used before this app. */
export default function ImportExpenses() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [failure, setFailure] = useState(null);

  const downloadTemplate = async () => {
    try {
      const res = await api.get('/expenses/import/template', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'expense-import-template.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setFailure({ error: errorMessage(err, 'Could not download the template.'), details: [] });
    }
  };

  const upload = async (allowDuplicates) => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    setFailure(null);
    const data = new FormData();
    data.append('file', file);
    if (allowDuplicates) data.append('allowDuplicates', 'true');
    try {
      const res = await api.post('/expenses/import', data);
      setResult(res.data.imported);
      setFile(null);
    } catch (err) {
      setFailure({
        error: errorMessage(err, 'Import failed.'),
        details: err.response?.data?.details || [],
        onlyDuplicates: Boolean(err.response?.data?.onlyDuplicates),
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = (e) => {
    e.preventDefault();
    upload(false);
  };

  return (
    <div className="mx-auto" style={{ maxWidth: 860 }}>
      <PageHeader
        title="Import from Excel"
        subtitle="Add many expenses at once from a spreadsheet. If any row has a problem, nothing is imported."
        back={{ to: '/expenses', label: 'Expenses' }}
      />

      <div className="row g-3">
        <div className="col-md-5">
          <div className="card h-100">
            <div className="card-header">1. Get the template</div>
            <div className="card-body">
              <p className="text-secondary small">
                The template has the right columns, an example row, and dropdowns with your current categories and payment modes.
              </p>
              <button className="btn btn-outline-primary" onClick={downloadTemplate}>
                <i aria-hidden="true" className="bi bi-download" />Download template
              </button>
            </div>
          </div>
        </div>
        <div className="col-md-7">
          <form className="card h-100" onSubmit={handleUpload}>
            <div className="card-header">2. Upload your file</div>
            <div className="card-body">
              <label htmlFor="import-file" className="d-block border border-2 rounded-3 text-center p-4"
                     style={{ borderStyle: 'dashed', cursor: 'pointer' }}>
                <i aria-hidden="true" className={`bi bi-${file ? 'file-earmark-check text-success' : 'file-earmark-spreadsheet text-secondary'} fs-2 d-block mb-1`} />
                <span className="fw-medium">{file ? file.name : 'Choose an Excel file'}</span>
                <span className="d-block small text-secondary">.xlsx or .xls · up to 2,000 rows</span>
              </label>
              <input id="import-file" type="file" className="visually-hidden" key={result ?? 'file'}
                     accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                     onChange={(e) => { setFile(e.target.files[0] || null); setResult(null); setFailure(null); }} />
            </div>
            <div className="card-footer d-flex justify-content-end">
              <button className="btn btn-primary" disabled={!file || uploading}>
                {uploading
                  ? <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Importing…</>
                  : <><i aria-hidden="true" className="bi bi-upload" />Import</>}
              </button>
            </div>
          </form>
        </div>
      </div>

      {result !== null && (
        <div className="alert alert-success d-flex gap-2 align-items-center mt-3">
          <i aria-hidden="true" className="bi bi-check-circle" />
          Imported {result} expense{result === 1 ? '' : 's'}. <Link to="/expenses">View expenses</Link>
        </div>
      )}
      {failure && (
        <div className={`alert ${failure.onlyDuplicates ? 'alert-warning' : 'alert-danger'} mt-3`}>
          <div className="fw-semibold">
            <i aria-hidden="true" className={`bi bi-${failure.onlyDuplicates ? 'files' : 'exclamation-circle'} me-2`} />{failure.error}
          </div>
          {failure.details.length > 0 && (
            <ul className="mb-0 mt-2 small">{failure.details.map((d) => <li key={d}>{d}</li>)}</ul>
          )}
          {failure.onlyDuplicates && (
            <div className="mt-3 d-flex flex-wrap align-items-center gap-2">
              <span className="small">If these are genuinely separate expenses:</span>
              <button className="btn btn-sm btn-warning" onClick={() => upload(true)} disabled={uploading}>
                Import anyway
              </button>
            </div>
          )}
        </div>
      )}

      <div className="card mt-3">
        <div className="card-header">Columns</div>
        <div className="table-responsive" tabIndex={0} role="region" aria-label="Import columns table">
          <table className="table align-middle">
            <thead><tr><th>Heading</th><th /><th>What to enter</th></tr></thead>
            <tbody>
              {COLUMNS.map(([name, need, hint]) => (
                <tr key={name}>
                  <td className="fw-medium text-nowrap">{name}</td>
                  <td>
                    <span className={`badge rounded-pill ${need === 'required' ? 'bg-primary-subtle text-primary-emphasis' : 'bg-secondary-subtle text-secondary-emphasis'}`}>
                      {need}
                    </span>
                  </td>
                  <td className="text-secondary">{hint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-body pt-0 small text-secondary">
          Imported expenses are entered under your name. Each one's history shows it came from an import.
        </div>
      </div>
    </div>
  );
}
