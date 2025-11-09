class CreateActions < ActiveRecord::Migration[8.0]
  def change
    create_table :actions do |t|
      t.references :call, null: false, foreign_key: true
      t.string :kind, null: false
      t.string :status, null: false, default: "pending"
      t.text :payload, null: false
      t.jsonb :metadata, null: false, default: {}
      t.jsonb :result, null: false, default: {}

      t.timestamps
    end

    add_index :actions, :kind
    add_index :actions, :status
    add_index :actions, %i[call_id created_at]
  end
end
