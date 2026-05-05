import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import de from '../locales/de/common.json';
import en from '../locales/en/common.json';
import fr from '../locales/fr/common.json';
import es from '../locales/es/common.json';
import it from '../locales/it/common.json';
import pt from '../locales/pt/common.json';
import nl from '../locales/nl/common.json';
import pl from '../locales/pl/common.json';
import cs from '../locales/cs/common.json';
import sk from '../locales/sk/common.json';
import hu from '../locales/hu/common.json';
import ro from '../locales/ro/common.json';
import bg from '../locales/bg/common.json';
import hr from '../locales/hr/common.json';
import sr from '../locales/sr/common.json';
import sl from '../locales/sl/common.json';
import da from '../locales/da/common.json';
import nb from '../locales/nb/common.json';
import sv from '../locales/sv/common.json';
import fi from '../locales/fi/common.json';
import et from '../locales/et/common.json';
import lv from '../locales/lv/common.json';
import lt from '../locales/lt/common.json';
import el from '../locales/el/common.json';
import sq from '../locales/sq/common.json';
import mk from '../locales/mk/common.json';
import bs from '../locales/bs/common.json';
import ca from '../locales/ca/common.json';
import cy from '../locales/cy/common.json';
import ga from '../locales/ga/common.json';
import mt from '../locales/mt/common.json';
import is from '../locales/is/common.json';
import tr from '../locales/tr/common.json';
import ru from '../locales/ru/common.json';
import uk from '../locales/uk/common.json';
import be from '../locales/be/common.json';
import fa from '../locales/fa/common.json';

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        de: { common: de },
        en: { common: en },
        fr: { common: fr },
        es: { common: es },
        it: { common: it },
        pt: { common: pt },
        nl: { common: nl },
        pl: { common: pl },
        cs: { common: cs },
        sk: { common: sk },
        hu: { common: hu },
        ro: { common: ro },
        bg: { common: bg },
        hr: { common: hr },
        sr: { common: sr },
        sl: { common: sl },
        da: { common: da },
        nb: { common: nb },
        sv: { common: sv },
        fi: { common: fi },
        et: { common: et },
        lv: { common: lv },
        lt: { common: lt },
        el: { common: el },
        sq: { common: sq },
        mk: { common: mk },
        bs: { common: bs },
        ca: { common: ca },
        cy: { common: cy },
        ga: { common: ga },
        mt: { common: mt },
        is: { common: is },
        tr: { common: tr },
        ru: { common: ru },
        uk: { common: uk },
        be: { common: be },
        fa: { common: fa },
      },
      defaultNS: 'common',
      fallbackLng: 'de',
      detection: {
        order: ['localStorage', 'navigator'],
        caches: ['localStorage'],
        lookupLocalStorage: 'i18nextLng',
      },
      interpolation: {
        escapeValue: false,
      },
    });
}

export default i18n;
