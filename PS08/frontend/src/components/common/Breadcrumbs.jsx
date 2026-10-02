import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const Breadcrumbs = ({ items }) => {
  return (
    <nav className="breadcrumbs">
      <Link to="/dashboard"><Home size={12} /></Link>
      {items.map((item, i) => (
        <span key={i} style={{ display: 'contents' }}>
          <span className="bc-sep"><ChevronRight size={12} /></span>
          {i === items.length - 1 ? (
            <span className="bc-current">{item.label}</span>
          ) : (
            <Link to={item.path}>{item.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
