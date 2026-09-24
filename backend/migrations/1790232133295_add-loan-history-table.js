/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.createTable('loan_history', {
    id: 'id',
    loan_id: {
      type: 'integer',
      notNull: true,
      references: '"loans"',
      onDelete: 'CASCADE',
    },
    field_name: { type: 'varchar(255)', notNull: true },
    old_value: { type: 'text' },
    new_value: { type: 'text' },
    changed_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    changed_by: { type: 'varchar(255)' },
  });
  
  pgm.createIndex('loan_history', 'loan_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.dropTable('loan_history');
};
