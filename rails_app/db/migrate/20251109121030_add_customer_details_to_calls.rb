class AddCustomerDetailsToCalls < ActiveRecord::Migration[8.0]
  def change
    change_table :calls, bulk: true do |t|
      t.string :customer_name
      t.string :customer_phone
      t.string :customer_email
    end
  end
end
