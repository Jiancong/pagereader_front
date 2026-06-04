/** 使用条款 / 隐私政策分节文案（中/英） */
export type LegalSection = { title: string; body: string }

export const termsSectionsZh: LegalSection[] = [
  { title: "服务说明", body: "本服务是一款基于人工智能的演示文稿生成工具。用户可通过输入文本提示或上传文档，由系统自动生成演示文稿内容。我们保留随时新增、修改、暂停或终止全部或部分功能的权利。" },
  { title: "账户与资格", body: "使用本服务的部分功能需要注册账户。你应保证注册时提供的信息真实、准确、完整，并自行妥善保管账户凭证。你需对在你账户下发生的所有活动负责。若你代表某一组织使用本服务，则你声明已获得该组织的授权。" },
  { title: "用户内容与授权", body: "你对你上传、输入或生成的内容（以下简称「用户内容」）保留你依法享有的权利。为向你提供服务（包括处理、存储与展示），你授予我们在必要范围内使用用户内容的非独占许可。你应保证你的用户内容不侵犯任何第三方的知识产权、隐私权或其他合法权益。" },
  { title: "可接受使用", body: "你同意不将本服务用于任何违法或不当目的，包括但不限于：上传或生成违法、侵权、暴力、仇恨、歧视或淫秽内容；侵犯他人知识产权或隐私；传播恶意软件；进行未经授权的数据抓取、逆向工程或干扰服务正常运行的行为。" },
  { title: "知识产权", body: "本服务及其相关软件、界面、商标、标识等知识产权归 Bytelancers Limited 或其许可方所有。除本条款明确授予的权利外，本条款不向你转让任何知识产权。" },
  { title: "第三方服务", body: "本服务可能集成或依赖第三方提供的服务（如云存储、搜索、登录等）。该等第三方服务受其各自条款与政策约束，我们对第三方服务的可用性与行为不承担责任。" },
  { title: "免责声明", body: "本服务按「现状」和「现有」基础提供。在适用法律允许的最大范围内，我们不对服务的适销性、特定用途适用性、不中断或无错误作出任何明示或默示的保证。AI 生成内容可能存在不准确之处，你应在使用前自行核实。" },
  { title: "责任限制", body: "在适用法律允许的最大范围内，对于因使用或无法使用本服务而产生的任何间接、附带、特殊、后果性或惩罚性损害，我们不承担责任。本条不影响依据强制性法律不可排除的责任（如适用）。" },
  { title: "服务变更与终止", body: "我们可基于运营需要变更或终止服务。若你违反本条款，我们有权暂停或终止你的账户。你也可随时停止使用本服务并注销账户。" },
  { title: "条款修订", body: "我们可能不时更新本条款。重大变更将通过适当方式予以提示。变更生效后你继续使用本服务，即视为接受修订后的条款。" },
  { title: "适用法律与争议", body: "本条款的订立、效力、解释及争议解决，适用中国香港特别行政区法律。涉及欧盟用户的，相关消费者保护的强制性规定不受影响。" },
]

export const termsSectionsEn: LegalSection[] = [
  { title: "The service", body: "The Service is an AI-assisted presentation tool. You may enter prompts or upload documents to generate deck content. We may add, change, suspend, or discontinue features at any time." },
  { title: "Accounts", body: "Some features require an account. You must provide accurate information and keep credentials secure. You are responsible for activity under your account. If you use the Service on behalf of an organisation, you represent that you are authorised to do so." },
  { title: "Your content", body: "You retain rights in content you submit or generate. You grant us a non-exclusive licence to use it as needed to operate the Service. You must not infringe third-party IP, privacy, or other rights." },
  { title: "Acceptable use", body: "You must not use the Service unlawfully or to create or distribute illegal, infringing, abusive, hateful, or harmful material; to spread malware; or to scrape, reverse engineer, or disrupt the Service without permission." },
  { title: "Intellectual property", body: "The Service, software, UI, and branding remain the property of Bytelancers Limited or its licensors. No IP is transferred except as expressly stated." },
  { title: "Third parties", body: "The Service may rely on third-party providers (e.g. cloud, sign-in). Their terms apply. We are not responsible for their availability or conduct." },
  { title: "Disclaimer", body: "The Service is provided \"as is\". To the fullest extent permitted by law we disclaim warranties of merchantability, fitness for a particular purpose, and uninterrupted error-free operation. AI output may be inaccurate—verify before use." },
  { title: "Limitation of liability", body: "To the fullest extent permitted by law we are not liable for indirect, incidental, special, consequential, or punitive damages arising from use of the Service. Mandatory consumer rights (where applicable) are unaffected." },
  { title: "Changes and termination", body: "We may change or stop the Service. We may suspend accounts for breach. You may stop using the Service at any time." },
  { title: "Updates to these Terms", body: "We may update these Terms. Material changes will be communicated appropriately. Continued use after changes means acceptance." },
  { title: "Law and disputes", body: "These Terms are governed by the laws of Hong Kong SAR. Mandatory consumer protection rules in the EU/EEA (where applicable) remain in force." },
]

export const privacySectionsZh: LegalSection[] = [
  { title: "数据控制者", body: "本服务的个人数据控制者为 Bytelancers Limited（注册地：中国香港）。如需联系我们的数据事务负责人，请发送邮件至 bd@bytelancers.com。" },
  { title: "我们收集的数据", body: "我们可能收集：（a）你主动提供的数据，如注册时的邮箱、昵称、密码；（b）你上传或输入的内容，如文档、提示文本及生成的演示文稿；（c）自动收集的技术数据，如设备信息、浏览器类型、IP 地址、访问日志及使用情况；（d）Cookie 及类似技术产生的数据。" },
  { title: "处理目的与法律依据", body: "我们基于 GDPR 第 6 条处理你的数据：为履行向你提供服务的合同（合同必要性）；基于你的同意（如可选的营销信息、非必要 Cookie）；为遵守法律义务；以及为我们的合法利益（如保障安全、改进产品），且不超越你的基本权利与自由。" },
  { title: "数据的使用方式", body: "我们使用你的数据以：提供并维护服务；处理并生成演示文稿；进行账户管理与身份验证；保障平台安全、防范欺诈与滥用；分析与改进产品功能；以及在你同意或法律要求时与你沟通。" },
  { title: "数据共享与披露", body: "我们不会出售你的个人数据。我们仅在以下情形共享数据：与协助我们运营的受托处理方（如云存储、计算服务）共享，且其受合同约束；为遵守法律、法规或政府要求；在企业合并、收购或资产转让中；或经你明确同意。" },
  { title: "国际数据传输", body: "由于我们使用的基础设施可能位于不同国家或地区，你的数据可能被传输至你所在国/地区以外。对于涉及欧洲经济区（EEA）的数据传输，我们将采取适当保障措施（如欧盟标准合同条款 SCC）以确保数据获得充分保护。" },
  { title: "数据保留", body: "我们仅在实现本政策所述目的所必需的期间内保留你的个人数据，或按法律要求的更长期限保留。当数据不再需要时，我们将予以删除或匿名化处理。你也可请求删除你的账户与相关数据。" },
  { title: "你的权利（GDPR）", body: "在适用法律范围内，你享有以下权利：访问权、更正权、删除权（「被遗忘权」）、限制处理权、数据可携权、反对权，以及撤回同意的权利。你还有权向你所在地的数据保护监管机构投诉。我们将在收到请求后于法定期限内回应。" },
  { title: "Cookie 与跟踪技术", body: "我们使用必要 Cookie 维持登录状态与基本功能，并可能在征得同意后使用分析类 Cookie 以了解使用情况。你可通过浏览器设置管理或拒绝 Cookie，但这可能影响部分功能的使用。" },
  { title: "数据安全", body: "我们采取合理的技术与组织措施（如传输加密、访问控制）保护你的数据免遭未经授权的访问、披露、更改或销毁。但请注意，任何通过互联网传输或存储的方式都无法保证绝对安全。" },
  { title: "未成年人", body: "本服务不面向 16 周岁以下（或你所在司法辖区规定的同意年龄以下）的未成年人。我们不会在知情情况下收集未成年人的个人数据。如发现相关情况，我们将及时删除。" },
  { title: "政策更新", body: "我们可能不时更新本隐私政策。重大变更将通过适当方式予以提示。请定期查阅本页面以了解最新内容。" },
]

export const privacySectionsEn: LegalSection[] = [
  { title: "Data controller", body: "The controller is Bytelancers Limited (Hong Kong). Privacy enquiries: bd@bytelancers.com." },
  { title: "Data we collect", body: "We may collect: (a) account data you provide (email, name, password); (b) content you upload or generate; (c) technical data (device, browser, IP, logs, usage); (d) data from cookies and similar technologies." },
  { title: "Purposes and legal bases (GDPR Art. 6)", body: "We process data to perform our contract with you; based on consent where required (e.g. non-essential cookies, marketing); to comply with law; and for legitimate interests (security, product improvement) where your rights are not overridden." },
  { title: "How we use data", body: "To provide and secure the Service; generate presentations; manage accounts; prevent abuse; improve features; and communicate where permitted or required." },
  { title: "Sharing", body: "We do not sell personal data. We share with processors under contract, when required by law, in corporate transactions, or with your consent." },
  { title: "International transfers", body: "Data may be processed outside your country. For EEA data we use appropriate safeguards such as EU Standard Contractual Clauses where required." },
  { title: "Retention", body: "We keep data only as long as needed for the purposes above or as required by law, then delete or anonymise it. You may request account deletion." },
  { title: "Your rights", body: "Where GDPR applies you may have rights of access, rectification, erasure, restriction, portability, objection, and withdrawal of consent, and to lodge a complaint with a supervisory authority. We respond within statutory time limits." },
  { title: "Cookies", body: "We use essential cookies for sign-in and core features and, with consent where required, analytics cookies. Browser controls may limit functionality." },
  { title: "Security", body: "We use reasonable technical and organisational measures (encryption, access controls). No method of transmission or storage is 100% secure." },
  { title: "Children", body: "The Service is not directed at children under 16 (or the applicable age of consent). We do not knowingly collect their data." },
  { title: "Policy changes", body: "We may update this policy. Material changes will be notified appropriately. Please review this page periodically." },
]

export function getTermsSections(locale: string): LegalSection[] {
  return locale === "en" ? termsSectionsEn : termsSectionsZh
}

export function getPrivacySections(locale: string): LegalSection[] {
  return locale === "en" ? privacySectionsEn : privacySectionsZh
}
