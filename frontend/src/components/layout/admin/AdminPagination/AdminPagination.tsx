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
          >
            <FaChevronLeft />
            <span>Anterior</span>
          </button>

          <div className={styles.indicator}>
            Pagina {hasItems ? page : 0} de {hasItems ? totalPages : 0}
          </div>

          <button
            type="button"
            className={styles.navButton}
            disabled={!hasItems || page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Pagina siguiente"
          >
            <span>Siguiente</span>
            <FaChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}
