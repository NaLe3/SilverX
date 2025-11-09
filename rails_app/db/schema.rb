# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_11_09_134032) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"

  create_table "actions", force: :cascade do |t|
    t.bigint "call_id", null: false
    t.string "kind", null: false
    t.string "status", default: "pending", null: false
    t.text "payload", null: false
    t.jsonb "metadata", default: {}, null: false
    t.jsonb "result", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["call_id", "created_at"], name: "index_actions_on_call_id_and_created_at"
    t.index ["call_id"], name: "index_actions_on_call_id"
    t.index ["kind"], name: "index_actions_on_kind"
    t.index ["status"], name: "index_actions_on_status"
  end

  create_table "calls", force: :cascade do |t|
    t.string "external_id"
    t.string "status", default: "new", null: false
    t.jsonb "metadata", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "customer_name"
    t.string "customer_phone"
    t.string "customer_email"
    t.index ["external_id"], name: "index_calls_on_external_id", unique: true
  end

  create_table "messages", force: :cascade do |t|
    t.bigint "call_id", null: false
    t.string "role", null: false
    t.text "content", null: false
    t.jsonb "metadata", default: {}, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["call_id"], name: "index_messages_on_call_id"
    t.index ["created_at"], name: "index_messages_on_created_at"
  end

  create_table "users", force: :cascade do |t|
    t.string "email", default: "", null: false
    t.string "encrypted_password", default: "", null: false
    t.integer "role", default: 1, null: false
    t.string "reset_password_token"
    t.datetime "reset_password_sent_at"
    t.datetime "remember_created_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["reset_password_token"], name: "index_users_on_reset_password_token", unique: true
  end

  add_foreign_key "actions", "calls"
  add_foreign_key "messages", "calls"
end
