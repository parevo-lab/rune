package database

import (
	"database/sql"
	"fmt"
	"strings"

	_ "github.com/lib/pq"
)

type PostgresDriver struct{}

func (d *PostgresDriver) Connect(config ConnectionConfig) (*sql.DB, error) {
	sslmode := "disable"
	connStr := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
		config.Host, config.Port, config.User, config.Password, config.Database, sslmode)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open postgres connection: %w", err)
	}

	if err := db.Ping(); err != nil {
		db.Close()
		return nil, fmt.Errorf("failed to ping postgres: %w", err)
	}

	return db, nil
}

func (d *PostgresDriver) GetDatabases(db *sql.DB) ([]string, error) {
	rows, err := db.Query("SELECT datname FROM pg_database WHERE datistemplate = false")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var databases []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		databases = append(databases, name)
	}
	return databases, nil
}

func (d *PostgresDriver) GetTables(db *sql.DB, database string) ([]TableInfo, error) {
	// Simple table list for Postgres
	query := `
		SELECT 
			table_name, 
			'heap' as engine,
			0 as row_count,
			0 as data_size,
			'' as create_time
		FROM information_schema.tables 
		WHERE table_schema = 'public'
	`
	rows, err := db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tables []TableInfo
	for rows.Next() {
		var t TableInfo
		if err := rows.Scan(&t.Name, &t.Engine, &t.RowCount, &t.DataSize, &t.CreateTime); err != nil {
			return nil, err
		}
		tables = append(tables, t)
	}
	return tables, nil
}

func (d *PostgresDriver) GetColumns(db *sql.DB, database, table string) ([]ColumnInfo, error) {
	query := `
		SELECT 
			column_name, 
			data_type, 
			is_nullable, 
			'', 
			column_default, 
			'' 
		FROM information_schema.columns 
		WHERE table_name = $1 AND table_schema = 'public'
		ORDER BY ordinal_position
	`
	rows, err := db.Query(query, table)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var columns []ColumnInfo
	for rows.Next() {
		var c ColumnInfo
		var nullable string
		var defaultVal sql.NullString
		if err := rows.Scan(&c.Name, &c.Type, &nullable, &c.Key, &defaultVal, &c.Extra); err != nil {
			return nil, err
		}
		c.Nullable = nullable == "YES"
		c.Default = defaultVal.String
		columns = append(columns, c)
	}
	return columns, nil
}

func (d *PostgresDriver) GetIndexes(db *sql.DB, database, table string) ([]IndexInfo, error) {
	// Simplified indexes for PG PoC
	return []IndexInfo{}, nil
}

func (d *PostgresDriver) BuildTableDataQuery(req TableDataRequest, primaryKey string) string {
	orderBy := req.OrderBy
	if orderBy == "" && primaryKey != "" {
		orderBy = primaryKey
	}
	orderDir := strings.ToUpper(req.OrderDir)
	if orderDir != "DESC" {
		orderDir = "ASC"
	}

	query := fmt.Sprintf("SELECT * FROM %s", d.QuoteIdentifier(req.Table))
	if orderBy != "" {
		query += fmt.Sprintf(" ORDER BY %s %s", d.QuoteIdentifier(orderBy), orderDir)
	}

	pageSize := req.PageSize
	if pageSize <= 0 {
		pageSize = 50
	}
	offset := (req.Page - 1) * pageSize
	query += fmt.Sprintf(" LIMIT %d OFFSET %d", pageSize, offset)

	return query
}

func (d *PostgresDriver) BuildCountQuery(database, table, filters string) string {
	where := ""
	if filters != "" {
		where = fmt.Sprintf(" WHERE %s", filters)
	}
	return fmt.Sprintf("SELECT COUNT(*) FROM %s%s", d.QuoteIdentifier(table), where)
}

func (d *PostgresDriver) BuildAlterTableQuery(database, table string, alteration TableAlteration) ([]string, error) {
	var statements []string
	quotedTable := d.QuoteIdentifier(table)

	// Rename table if requested
	if alteration.RenameTo != "" && alteration.RenameTo != table {
		statements = append(statements, fmt.Sprintf("ALTER TABLE %s RENAME TO %s", quotedTable, d.QuoteIdentifier(alteration.RenameTo)))
		quotedTable = d.QuoteIdentifier(alteration.RenameTo)
	}

	// Drop columns
	for _, col := range alteration.DropColumns {
		statements = append(statements, fmt.Sprintf("ALTER TABLE %s DROP COLUMN %s", quotedTable, d.QuoteIdentifier(col)))
	}

	// Add columns
	for _, col := range alteration.AddColumns {
		nullStr := "NOT NULL"
		if col.Nullable {
			nullStr = "NULL"
		}
		defaultStr := ""
		if col.Default != "" {
			defaultStr = fmt.Sprintf(" DEFAULT '%s'", col.Default)
		}
		statements = append(statements, fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s %s%s",
			quotedTable, d.QuoteIdentifier(col.Name), col.Type, nullStr, defaultStr))
	}

	// Modify columns
	for _, col := range alteration.ModifyColumns {
		quotedCol := d.QuoteIdentifier(col.Name)

		// Rename column if oldName is present and different
		if col.OldName != "" && col.OldName != col.Name {
			statements = append(statements, fmt.Sprintf("ALTER TABLE %s RENAME COLUMN %s TO %s",
				quotedTable, d.QuoteIdentifier(col.OldName), quotedCol))
		}

		// Type change
		statements = append(statements, fmt.Sprintf("ALTER TABLE %s ALTER COLUMN %s TYPE %s USING %s::%s",
			quotedTable, quotedCol, col.Type, quotedCol, col.Type))

		// Nullable change
		if col.Nullable {
			statements = append(statements, fmt.Sprintf("ALTER TABLE %s ALTER COLUMN %s DROP NOT NULL", quotedTable, quotedCol))
		} else {
			statements = append(statements, fmt.Sprintf("ALTER TABLE %s ALTER COLUMN %s SET NOT NULL", quotedTable, quotedCol))
		}

		// Default change
		if col.Default != "" {
			statements = append(statements, fmt.Sprintf("ALTER TABLE %s ALTER COLUMN %s SET DEFAULT '%s'", quotedTable, quotedCol, col.Default))
		} else {
			statements = append(statements, fmt.Sprintf("ALTER TABLE %s ALTER COLUMN %s DROP DEFAULT", quotedTable, quotedCol))
		}
	}

	return statements, nil
}

func (d *PostgresDriver) BuildTruncateTableQuery(database, table string) string {
	return fmt.Sprintf("TRUNCATE TABLE %s", d.QuoteIdentifier(table))
}

func (d *PostgresDriver) BuildDropTableQuery(database, table string) string {
	return fmt.Sprintf("DROP TABLE %s", d.QuoteIdentifier(table))
}

func (d *PostgresDriver) BuildInsertQuery(database, table string, columns []string) string {
	quotedCols := make([]string, len(columns))
	placeholders := make([]string, len(columns))
	for i, col := range columns {
		quotedCols[i] = d.QuoteIdentifier(col)
		placeholders[i] = fmt.Sprintf("$%d", i+1)
	}
	return fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)",
		d.QuoteIdentifier(table), strings.Join(quotedCols, ", "), strings.Join(placeholders, ", "))
}

func (d *PostgresDriver) BuildUpdateQuery(database, table, primaryKey string, columns []string) string {
	setClauses := make([]string, len(columns))
	for i, col := range columns {
		setClauses[i] = fmt.Sprintf("%s = $%d", d.QuoteIdentifier(col), i+1)
	}
	return fmt.Sprintf("UPDATE %s SET %s WHERE %s = $%d",
		d.QuoteIdentifier(table), strings.Join(setClauses, ", "), d.QuoteIdentifier(primaryKey), len(columns)+1)
}

func (d *PostgresDriver) BuildDeleteQuery(database, table, primaryKey string) string {
	return fmt.Sprintf("DELETE FROM %s WHERE %s = $1",
		d.QuoteIdentifier(table), d.QuoteIdentifier(primaryKey))
}

func (d *PostgresDriver) BuildBatchDeleteQuery(database, table, primaryKey string, count int) string {
	placeholders := make([]string, count)
	for i := range placeholders {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
	}
	return fmt.Sprintf("DELETE FROM %s WHERE %s IN (%s)",
		d.QuoteIdentifier(table), d.QuoteIdentifier(primaryKey), strings.Join(placeholders, ", "))
}

func (d *PostgresDriver) QuoteIdentifier(name string) string {
	return fmt.Sprintf("\"%s\"", name)
}

func (d *PostgresDriver) BuildDistinctValuesQuery(database, table, column string) string {
	return fmt.Sprintf("SELECT DISTINCT %s FROM %s ORDER BY %s LIMIT 100",
		d.QuoteIdentifier(column), d.QuoteIdentifier(table), d.QuoteIdentifier(column))
}
