class VoiceController < ApplicationController
  skip_forgery_protection

  # Répond à l'appel entrant: message d'accueil + Gather speech
  def inbound
    call_sid = params[:CallSid].presence
    @call = Call.find_by(external_id: call_sid) if call_sid
    @call ||= Call.create!(external_id: call_sid || "twilio-unknown-#{SecureRandom.hex(4)}", status: "inbound", metadata: { provider: "twilio" })

    action_url = continue_url(@call)

    xml = <<~XML
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice" language="fr-FR">Bienvenue, vous êtes en relation avec l'assistant. Après le bip, parlez.</Say>
        <Gather input="speech" language="fr-FR" action="#{action_url}" method="POST" speechTimeout="auto">
          <Say voice="alice" language="fr-FR">Comment puis-je vous aider ?</Say>
        </Gather>
      </Response>
    XML
    render xml: xml
  end

  # Reçoit la transcription speech → répond avec <Say> et relance un Gather
  def continue
    call_sid = params[:CallSid].presence
    @call = if params[:call_id].present?
      Call.find(params[:call_id])
    else
      Call.find_by!(external_id: call_sid)
    end
    user_text = params[:SpeechResult].to_s.strip

    if user_text.present?
      @call.messages.create!(role: "user", content: user_text, metadata: { provider: "twilio" })
    end

    # Réponse très simple (fake LLM)
    reply_text = if user_text.present?
      "D'accord, vous avez dit: #{user_text}. Souhaitez-vous ajouter quelque chose ?"
    else
      "Je n'ai pas entendu. Pouvez-vous répéter ?"
    end
    @call.messages.create!(role: "assistant", content: reply_text, metadata: { provider: "twilio" })

    action_url = continue_url(@call)
    safe_reply = ERB::Util.h(reply_text)
    xml = <<~XML
      <?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say voice="alice" language="fr-FR">#{safe_reply}</Say>
        <Gather input="speech" language="fr-FR" action="#{action_url}" method="POST" speechTimeout="auto">
          <Say voice="alice" language="fr-FR">Je vous écoute.</Say>
        </Gather>
      </Response>
    XML
    render xml: xml
  end

  private

  def continue_url(call)
    "#{request.base_url}/voice/continue?call_id=#{call.id}"
  end
end

