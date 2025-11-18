'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationBarProps {
  totalItems: number;
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (itemsPerPage: number) => void;
  itemLabel?: string; // Mặc định "thành viên"
  isDarkMode?: boolean;
  itemsPerPageOptions?: number[]; // Mặc định [5, 10, 20, 50, 100]
  showItemsPerPage?: boolean; // Mặc định true
  className?: string;
}

export default function PaginationBar({
  totalItems,
  currentPage,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemLabel = 'thành viên',
  isDarkMode = false,
  itemsPerPageOptions = [5, 10, 20, 50, 100],
  showItemsPerPage = true,
  className = ''
}: PaginationBarProps) {
  // Tính toán pagination
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const currentPageStart = totalItems > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0;
  const currentPageEnd = Math.min(currentPage * itemsPerPage, totalItems);
  const currentPageCount = totalItems > 0 ? currentPageEnd - currentPageStart + 1 : 0;

  // Xử lý thay đổi items per page
  const handleItemsPerPageChange = (value: number) => {
    onItemsPerPageChange(value);
    onPageChange(1); // Reset về trang 1 khi thay đổi items per page
  };

  // Render các nút số trang
  const renderPageNumbers = () => {
    if (totalPages === 0 || totalItems === 0) return null;

    if (totalPages <= 7) {
      // Hiển thị tất cả các trang nếu <= 7 trang
      return Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all duration-300 ${
            currentPage === page
              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md border border-blue-600'
              : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700 hover:shadow-sm' : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'} border border-gray-300`
          }`}
        >
          {page}
        </button>
      ));
    } else {
      // Hiển thị một số trang xung quanh trang hiện tại với ellipsis
      const pages: (number | string)[] = [];
      if (currentPage <= 4) {
        // Hiển thị 1-5, ..., last
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Hiển thị 1, ..., last-4 to last
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        // Hiển thị 1, ..., current-1, current, current+1, ..., last
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }

      return pages.map((page, index) => {
        if (page === '...') {
          return (
            <span key={`ellipsis-${index}`} className={`px-1.5 py-0.5 text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              ...
            </span>
          );
        }
        return (
          <button
            key={page}
            onClick={() => onPageChange(page as number)}
            className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all duration-300 ${
              currentPage === page
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md border border-blue-600'
                : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700 hover:shadow-sm' : 'text-gray-700 hover:bg-gray-100 hover:shadow-sm'} border border-gray-300`
            }`}
          >
            {page}
          </button>
        );
      });
    }
  };

  return (
    <div className={`px-4 flex items-center justify-between ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} ${className}`}>
      {/* Thông tin bên trái */}
      <span className="text-xs font-medium">
        Hiển thị <span className="font-bold text-blue-600">{currentPageCount}</span> trong tổng số <span className="font-bold text-blue-600">{totalItems}</span> {itemLabel}
      </span>

      {/* Controls bên phải */}
      <div className="flex items-center space-x-2">
        {/* Nút Trước */}
        <button
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage === 1 || totalPages === 0}
          className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-300 ${
            currentPage === 1 || totalPages === 0
              ? `${isDarkMode ? 'text-gray-500 bg-gray-700' : 'text-gray-400 bg-gray-100'} cursor-not-allowed`
              : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700 hover:shadow-md' : 'text-gray-700 hover:bg-gray-100 hover:shadow-md'} border border-gray-300`
          }`}
        >
          <div className="flex items-center space-x-1">
            <ChevronLeft size={10} strokeWidth={1.5} />
            <span>Trước</span>
          </div>
        </button>

        {/* Các nút số trang */}
        <div className="flex items-center space-x-1">
          {renderPageNumbers()}
        </div>

        {/* Nút Sau */}
        <button
          onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
          className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-300 ${
            currentPage === totalPages || totalPages === 0
              ? `${isDarkMode ? 'text-gray-500 bg-gray-700' : 'text-gray-400 bg-gray-100'} cursor-not-allowed`
              : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700 hover:shadow-md' : 'text-gray-700 hover:bg-gray-100 hover:shadow-md'} border border-gray-300`
          }`}
        >
          <div className="flex items-center space-x-1">
            <span>Sau</span>
            <ChevronRight size={10} strokeWidth={1.5} />
          </div>
        </button>

        {/* Text "Trang X" */}
        <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Trang <span className="font-bold text-blue-600">{currentPage}</span>
        </div>

        {/* Dropdown Items Per Page */}
        {showItemsPerPage && (
          <div className="flex items-center space-x-1">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Hiển thị:
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {itemsPerPageOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

