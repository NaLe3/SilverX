class CreateCalls < ActiveRecord::Migration[8.0]
  def change
    create_table :calls do |t|
      t.string :external_id
      t.string :status, null: false, default: "new"
      t.jsonb :metadata, null: false, default: {}

      t.timestamps
    end

    add_index :calls, :external_id, unique: true
  end
end

