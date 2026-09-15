// Replica o BankLogoHelper.cs do app original:
// mapeia nome de banco/cartão (ou ícone) -> logo SVG em images/banks/

function removeAccents(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const BANK_LOGOS = {
  nubank: 'images/banks/nubank.svg',
  nu: 'images/banks/nubank.svg',
  santander: 'images/banks/santander.svg',
  itau: 'images/banks/itau.svg',
  itaú: 'images/banks/itau.svg',
  itaucard: 'images/banks/itau.svg',
  bradesco: 'images/banks/bradesco.svg',
  bradescard: 'images/banks/bradesco.svg',
  inter: 'images/banks/inter.svg',
  'banco inter': 'images/banks/inter.svg',
  c6: 'images/banks/c6.svg',
  c6bank: 'images/banks/c6.svg',
  'c6 bank': 'images/banks/c6.svg',
  btg: 'images/banks/btg.svg',
  'btg pactual': 'images/banks/btg.svg',
  caixa: 'images/banks/caixa.svg',
  'caixa economica': 'images/banks/caixa.svg',
  cef: 'images/banks/caixa.svg',
  bb: 'images/banks/bb.svg',
  'banco do brasil': 'images/banks/banco-do-brasil.svg',
  ourocard: 'images/banks/banco-do-brasil.svg',
  stone: 'images/banks/stone.svg',
  xp: 'images/banks/xp.svg',
  'xp investimentos': 'images/banks/xp.svg',
  'mercado pago': 'images/banks/mercado-pago.svg',
  mercadopago: 'images/banks/mercado-pago.svg',
  picpay: 'images/banks/picpay.svg',
  pagseguro: 'images/banks/pagseguro.svg',
  pagbank: 'images/banks/pagbank.svg',
  neon: 'images/banks/neon.svg',
  cora: 'images/banks/cora.svg',
  banrisul: 'images/banks/banrisul.svg',
  sicoob: 'images/banks/sicoob.svg',
  sicredi: 'images/banks/sicredi.svg',
  safra: 'images/banks/safra.svg',
  'banco safra': 'images/banks/safra.svg',
  pan: 'images/banks/pan.svg',
  'banco pan': 'images/banks/pan.svg',
  bmg: 'images/banks/bmg.svg',
  'banco bmg': 'images/banks/bmg.svg',
  original: 'images/banks/original.svg',
  'banco original': 'images/banks/original.svg',
  bs2: 'images/banks/bs2.svg',
  daycoval: 'images/banks/daycoval.svg',
  sofisa: 'images/banks/sofisa.svg',
  credisis: 'images/banks/credisis.svg',
  cresol: 'images/banks/cresol.svg',
  unicred: 'images/banks/unicred.svg',
  uniprime: 'images/banks/uniprime.svg',
  asaas: 'images/banks/asaas.svg',
  recargapay: 'images/banks/recargapay.svg',
  'recarga pay': 'images/banks/recargapay.svg',
  ifood: 'images/banks/ifood-pago.svg',
  'ifood pago': 'images/banks/ifood-pago.svg',
  infinitepay: 'images/banks/infinitepay.svg',
  'infinite pay': 'images/banks/infinitepay.svg',
  grafeno: 'images/banks/grafeno.svg',
  brb: 'images/banks/brb.svg',
  brasilia: 'images/banks/brb.svg',
  'banco amazonia': 'images/banks/banco-amazonia.svg',
  basa: 'images/banks/banco-amazonia.svg',
  'banco do nordeste': 'images/banks/banco-do-nordeste.svg',
  bnb: 'images/banks/banco-do-nordeste.svg',
  bv: 'images/banks/bv.svg',
  votorantim: 'images/banks/bv.svg',
  'bank of america': 'images/banks/bank-of-america.svg',
  efi: 'images/banks/efi.svg',
  gerencianet: 'images/banks/efi.svg',
  letsbank: 'images/banks/letsbank.svg',
  linker: 'images/banks/linker.svg',
  magalupay: 'images/banks/magalupay.svg',
  magalu: 'images/banks/magalupay.svg',
  omni: 'images/banks/omni.svg',
  pinbank: 'images/banks/pinbank.svg',
  transfera: 'images/banks/transfera.svg',
  transfeera: 'images/banks/transfera.svg',
  almah: 'images/banks/Almah_Conta_logo-almah.svg',
  ailos: 'images/banks/Ailos_ailos.svg',
  artta: 'images/banks/Artta_logo-artta.svg',
  arbi: 'images/banks/Banco_Arbi_banco-arbi.svg',
  bmp: 'images/banks/Banco_BMP_bmp-logo.svg',
  industrial: 'images/banks/Banco_Industrial_do_Brasil_S.A_logo-bib.svg',
  mercantil: 'images/banks/Banco_Mercantil_do_Brasil_S.A_banco-mercantil-novo-azul.svg',
  paulista: 'images/banks/banco-paulista.svg',
  pine: 'images/banks/banco-pine.svg',
  rendimento: 'images/banks/Banco_Rendimento_banco_rendimento_logo_nova_.svg',
  topazio: 'images/banks/Banco_Topazio_logo-banco-topazio.svg',
  tribanco: 'images/banks/Banco_Tri_ngulo_-_Tribanco_logotribanco.svg',
  bees: 'images/banks/Bees_Bank_BEESBank_Horizontal.svg',
  'bk bank': 'images/banks/BK_Bank_bkBank.svg',
  bnp: 'images/banks/BNP_Paripas_logo-bnp.svg',
  capitual: 'images/banks/Capitual_logo_capitual.svg',
  'conta simples': 'images/banks/Conta_Simples_Solu__es_em_Pagamentos_conta-simples_logo.svg',
  contbank: 'images/banks/Contbank_logo-contbank.svg',
  dock: 'images/banks/Dock_dock-logo.svg',
  duepay: 'images/banks/DuePay_Duepay.svg',
  ip4y: 'images/banks/Ip4y_Ip4y-nome.svg',
  iugo: 'images/banks/Iugo_Iugo.svg',
  modobank: 'images/banks/ModoBank_logo.svg',
  mufg: 'images/banks/MUFG_mufg-seeklogo.svg',
  multiplo: 'images/banks/Multiplo_Bank_logotipo.svg',
  omie: 'images/banks/Omie.Cash_omie.svg',
  orionpay: 'images/banks/OrionPay_OrionPay.svg',
  paycash: 'images/banks/PayCash_logo.svg',
  'quality bank': 'images/banks/Quality_Digital_Bank_quality-logo-cinza.svg',
  squid: 'images/banks/Squid_Solu__es_Financeiras_logo.svg',
  starbank: 'images/banks/StarBank_logo.svg',
  sulcredi: 'images/banks/Sulcredi_marca.svg',
  uzzipay: 'images/banks/UzziPay_logo-uzzipay-branco-verde.svg',
  zemo: 'images/banks/Zemo_Bank_logowhite.svg',
};

export function removeAccentsFn(s) {
  return removeAccents(s);
}

export function getBankLogoUrl(bankOrCardName, icon) {
  // Fiel ao legado: o ícone tem prioridade sobre o nome.
  const target = removeAccents(icon ?? bankOrCardName ?? '');
  if (!target) return null;

  // Match direto
  if (BANK_LOGOS[target]) return `/${BANK_LOGOS[target]}`;

  // Substring / keyword match
  for (const [key, url] of Object.entries(BANK_LOGOS)) {
    const cleanKey = removeAccents(key);
    if (target.includes(cleanKey) || cleanKey.includes(target)) return `/${url}`;
  }

  return null;
}

export function getAvailableBanks() {
  return Object.keys(BANK_LOGOS).sort();
}