import {
  LuChevronLeft as ChevronLeft,
  LuChevronRight as ChevronRight
} from 'react-icons/lu';

const Pagination = ({ page, pages, total, limit, onPageChange }) => {
  if (pages <= 1) return null;

  const getPages = () => {
    const p = [];
    if (pages <= 7) {
      for (let i = 1; i <= pages; i++) p.push(i);
    } else {
      p.push(1);
      if (page > 3) p.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) p.push(i);
      if (page < pages - 2) p.push('...');
      p.push(pages);
    }
    return p;
  };

  return (
    <div className="pagination-esg">
      <button
        className="page-btn"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft size={14} />
      </button>
      {getPages().map((p, i) =>
        p === '...' ? (
          <span key={i} style={{ padding: '0 0.25rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>···</span>
        ) : (
          <button
            key={i}
            className={`page-btn ${p === page ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        )
      )}
      <button
        className="page-btn"
        disabled={page === pages}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight size={14} />
      </button>
      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
        {total} records
      </span>
    </div>
  );
};

export default Pagination;
