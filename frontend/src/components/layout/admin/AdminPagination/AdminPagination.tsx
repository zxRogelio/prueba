import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import styles from "./AdminPagination.module.css";

type AdminPaginationProps = {
  itemLabel: string;
  onPageChange: (page: number) => void;
  page: number;
  rangeEnd: number;
  rangeStart: number;
  totalItems: number;
  totalPages: number;
};

const DOTS = "dots";

function getVisiblePages(page: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | typeof DOTS> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) {
    pages.push(DOTS);
  }

  for (let current = start; current <= end; current += 1) {
    pages.push(current);
  }

  if (end < totalPages - 1) {
    pages.push(DOTS);
  }

  pages.push(totalPages);
  return pages;
}

export default function AdminPagination({
  itemLabel,
  onPageChange,
  page,
  rangeEnd,
  rangeStart,
  totalItems,
  totalPages,
}: AdminPaginationProps) {
  const hasItems = totalItems > 0;
  const visiblePages = getVisiblePages(page, totalPages);

  return (
    <div className={styles.root}>
      <p className={styles.summary}>
        {hasItems ? (
          <>
            Mostrando <strong>{rangeStart}</strong> a <strong>{rangeEnd}</strong> de{" "}
            <strong>{totalItems}</strong> {itemLabel}
          </>
        ) : (
          <>
            No hay <strong>{itemLabel}</strong> para mostrar
          </>
        )}
      </p>

      <div className={styles.controls}>
        <div className={styles.navigation}>
          <button
            type="button"
            className={styles.navButton}
            disabled={!hasItems || page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Pagina anterior"
            title="Pagina anterior"
          >
            <FaChevronLeft />
          </button>

          <div className={styles.pages} aria-label="Paginas">
            {hasItems ? (
              visiblePages.map((item, index) =>
                item === DOTS ? (
                  <span key={`dots-${index}`} className={styles.dots}>
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    className={`${styles.pageButton} ${
                      item === page ? styles.pageButtonActive : ""
                    }`}
                    onClick={() => onPageChange(item)}
                    aria-current={item === page ? "page" : undefined}
                    aria-label={`Ir a pagina ${item}`}
                    title={`Pagina ${item}`}
                  >
                    {item}
                  </button>
                ),
              )
            ) : (
              <span className={styles.dots}>0</span>
            )}
          </div>

          <button
            type="button"
            className={styles.navButton}
            disabled={!hasItems || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Pagina siguiente"
            title="Pagina siguiente"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}
