Rails.application.routes.draw do
  devise_for :users

  # Health / status endpoints
  get "up" => "rails/health#show", as: :rails_health_check
  get "health" => "health#index"

  resources :calls, only: [:index, :show, :create] do
    resources :messages, only: [:index, :create]
  end

  post "/tools/dispatch" => "tools#dispatch"

  namespace :admin do
    resource :dashboard, controller: "dashboard", only: :show
    resources :calls, only: [:index, :show]

    root to: "dashboard#show"
  end

  # Webhooks téléphonie (Twilio-like)
  post "/voice/inbound" => "voice#inbound"
  post "/voice/continue" => "voice#continue"

  # Root of the application -> admin dashboard
  root "admin/dashboard#show"
end
