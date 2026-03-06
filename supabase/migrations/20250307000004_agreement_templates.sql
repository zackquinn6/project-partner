-- Agreement templates (liability, membership) with full version history.
-- Each edit inserts a new row; "current" = latest created_at per type.
CREATE TABLE IF NOT EXISTS public.agreement_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('liability', 'membership')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_agreement_templates_type_created
  ON public.agreement_templates(type, created_at DESC);

ALTER TABLE public.agreement_templates ENABLE ROW LEVEL SECURITY;

-- Admins and authenticated can read (for display); only authenticated can insert (admin UI).
CREATE POLICY "Allow read agreement_templates"
  ON public.agreement_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert agreement_templates"
  ON public.agreement_templates FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON TABLE public.agreement_templates IS 'Versioned agreement templates (liability, membership). Current = latest created_at per type.';

-- Seed initial versions only when table is empty.
INSERT INTO public.agreement_templates (type, body)
SELECT 'liability', $body$
LIABILITY POLICY (Placeholder)

This is placeholder content for the Project Partner Liability Policy. It will be replaced with the full legal text.

1. Scope
Use of the Project Partner app and services is subject to this liability policy.

2. Assumption of Risk
You assume all risks associated with do-it-yourself projects, use of instructions, and reliance on app content. Project Partner provides informational guidance only and does not perform, supervise, or guarantee any work.

3. Limitation of Liability
To the maximum extent permitted by law, Project Partner's liability is limited. Project Partner is not liable for indirect, incidental, or consequential damages arising from your use of the app or services.

4. Professional Advice
Where applicable law requires licensed professionals (e.g. electrical, plumbing), you are responsible for obtaining such advice. The app does not replace professional judgment.

5. Acceptance
By accepting this policy you agree to the terms above and confirm you have read and understood them.
$body$
WHERE NOT EXISTS (SELECT 1 FROM public.agreement_templates WHERE type = 'liability');

INSERT INTO public.agreement_templates (type, body)
SELECT 'membership', $body$
### Service Terms for Project Partner

These Service Terms (the Terms) are between Project Partner ("Project Partner") and the individual or entity receiving services ("Participant"). These Terms govern Project Partner's provision of project guidance, instructional content, tools, and support related to do‑it‑yourself projects (the Services). By using the Services, forwarding receipts, or otherwise engaging with Project Partner, the Participant agrees to these Terms.

---

### 1. Scope of Services
- **Services Provided**  
  Project Partner provides instructional content, step‑by‑step workflows, templates, tool‑lists, safety guidance, digital features (including receipt ingestion and budget tools), and non‑technical project support.
- **Informational Nature**  
  All content and guidance are educational and informational in nature and are intended to assist the Participant in performing their own work. Project Partner does not perform physical labor, supervise work on site, or assume control of the Participant's worksite.

---

### 2. No Guarantee of Results and No Professional Relationship
- **No Outcome Guarantee**  
  Project Partner does not guarantee any particular result, fit‑for‑purpose outcome, or project timeline. Results depend on Participant decisions, skill, local conditions, materials, tools, and compliance with applicable laws.
- **No Professional Services**  
  Unless explicitly agreed in a separate written contract signed by an authorized representative of Project Partner, the Services do not create a professional-client relationship (such as contractor, engineering, legal, medical, or other licensed professional services). Participants must seek licensed professionals where required by law or where specialized expertise is needed.

---

### 3. Assumption of Risk and Participant Responsibilities
- **Assumption of Risk**  
  The Participant accepts full responsibility for planning, execution, supervision, and safety for any work performed. The Participant assumes all risks associated with using the Services, including personal injury, property damage, and financial loss.
- **Participant Obligations**  
  - Follow applicable laws, building codes, permits, and manufacturer instructions.  
  - Use appropriate safety equipment and safe work practices.  
  - Verify materials, measurements, and suitability before performing work.  
  - Stop and consult a qualified professional if unsure about a procedure or safety issue.  
- **Receiving Third‑Party Materials**  
  Project Partner may provide links, vendor templates, or third‑party content. Project Partner is not responsible for the accuracy or safety of third‑party content.

---

### 4. Limitation of Liability and Indemnification
- **Limitation of Liability**  
  To the maximum extent permitted by law, Project Partner's total liability for any claim arising from or related to the Services, whether in contract, tort, strict liability, or otherwise, shall not exceed the amount paid by the Participant to Project Partner for the Services in the 12 months preceding the claim. In no event shall Project Partner be liable for any indirect, special, incidental, punitive, or consequential damages, including lost profits, lost data, or business interruption.
- **Indemnification**  
  The Participant agrees to indemnify, defend, and hold harmless Project Partner and its officers, employees, contractors, and agents from and against any claims, losses, liabilities, damages, costs, and expenses (including reasonable attorneys' fees) arising out of or related to the Participant's use of the Services, breach of these Terms, or negligent or willful acts or omissions.

---

### 5. Safety Warnings and Dangerous Activities
- **No Obligation to Advise on Hazardous Work**  
  Project Partner may provide general safety guidance but does not assume responsibility for identifying all hazards or for supervising dangerous activities.
- **High‑Risk Work**  
  Work that involves structural changes, electrical, gas, hazardous chemicals, confined spaces, heavy equipment, working at height, or other high‑risk activities should only be performed by appropriately licensed and insured professionals. Participants must obtain required permits and follow manufacturer and regulatory safety procedures.
- **Emergency Situations**  
  Project Partner is not an emergency service and will not respond to emergencies or provide crisis intervention instructions.

---

### 6. Miscellaneous Terms
- **Changes to Services and Terms**  
  Project Partner may modify or discontinue the Services or these Terms at any time. Continued use after changes constitutes acceptance of the revised Terms.
- **Intellectual Property**  
  All content provided by Project Partner is its property or used under license. Participants are granted a non‑exclusive, non‑transferable license to use content for their personal or project‑related use only. Redistribution, resale, or public posting is prohibited without prior written consent.
- **Data and Privacy**  
  Project Partner may collect and process data necessary to provide Services. Data handling is governed by the Project Partner Privacy Policy.
- **Termination**  
  Either party may terminate access to Services in accordance with Project Partner's policies. Termination does not relieve the Participant of obligations incurred prior to termination, including indemnity or payment obligations.
- **Governing Law**  
  These Terms are governed by the laws of the jurisdiction specified in the Project Partner account or service agreement. If no jurisdiction is specified, the laws of the commonwealth or state where Project Partner is incorporated will apply.
- **Severability**  
  If any provision is held unenforceable, the remaining provisions remain in full force.

---

### Acceptance
By using Project Partner, the Participant acknowledges they have read, understand, and agree to these Terms.
$body$
WHERE NOT EXISTS (SELECT 1 FROM public.agreement_templates WHERE type = 'membership');
