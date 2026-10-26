import type { ToolFaqEntry } from "../types";

/**
 * FAQ for the tools whose registry entry had none. Kept in one file so the
 * questions can be reviewed together; merged by `registry/index.ts` only when
 * the tool itself declares no FAQ. Every answer states a real limit of the
 * tool rather than a promise.
 */
export const faqAdditions: Record<string, ToolFaqEntry[]> = {
  "pdf-organize": [
    {
      question: "Les signets et les liens sont-ils conservés après réorganisation ?",
      answer:
        "Les pages sont copiées telles quelles, avec leur contenu et leur qualité. Les signets (table des matières) et les liens internes qui pointaient vers une page supprimée ne sont pas reportés : vérifiez le document final si votre PDF en dépend.",
    },
    {
      question: "Puis-je réorganiser un PDF de plusieurs centaines de pages ?",
      answer:
        "Oui, jusqu'à 1 000 pages. Les vignettes sont rendues à la demande pour ménager la mémoire du navigateur ; sur un téléphone, un très long document reste manipulable mais plus lent à afficher.",
    },
  ],
  "pdf-rotate": [
    {
      question: "La rotation dégrade-t-elle la qualité du document ?",
      answer:
        "Non. L'outil modifie l'attribut de rotation de chaque page (la méthode prévue par le format PDF) sans redessiner le contenu : texte, images et vecteurs restent strictement identiques.",
    },
    {
      question: "Pourquoi certaines pages s'affichent-elles déjà pivotées ?",
      answer:
        "Un scanner ou un logiciel a pu enregistrer la page avec une rotation intrinsèque. L'outil s'applique par-dessus : sélectionnez seulement les pages concernées et choisissez l'angle qui les remet d'aplomb.",
    },
  ],
  "pdf-extract-pages": [
    {
      question: "Puis-je changer l'ordre des pages extraites ?",
      answer:
        "Non : les pages extraites gardent l'ordre du document d'origine. Pour les réordonner, passez ensuite par « Organiser les pages », ou utilisez directement cet outil qui permet aussi de supprimer des pages.",
    },
    {
      question: "Comment saisir plusieurs plages de pages ?",
      answer:
        "Séparez-les par des virgules, par exemple « 1-3, 7, 10-12 ». Les numéros correspondent à la position des pages dans le fichier, pas aux numéros imprimés en bas de page.",
    },
  ],
  "pdf-add-text": [
    {
      question: "Le texte ajouté modifie-t-il le texte existant du document ?",
      answer:
        "Non, il est dessiné par-dessus la page. Pour corriger un passage existant, utilisez le modificateur PDF (outil « Modifier le texte »), qui réécrit le contenu de la page quand la police le permet.",
    },
    {
      question: "Quelles polices et quels caractères sont disponibles ?",
      answer:
        "Helvetica, Times et Courier (polices standard du format PDF) en normal, gras et italique, plus les familles libres incorporées proposées dans le modificateur. Les accents et caractères latins passent ; les alphabets non latins et les emojis sont remplacés par « ? » et signalés.",
    },
  ],
  "pdf-watermark": [
    {
      question: "Le filigrane protège-t-il mon document contre la copie ?",
      answer:
        "Non. Un filigrane identifie l'origine ou le statut d'un document (brouillon, confidentiel) et décourage la réutilisation, mais il n'empêche ni la copie ni l'impression. Pour restreindre l'usage, ajoutez un mot de passe avec « Protéger un PDF ».",
    },
    {
      question: "Pourrai-je retirer le filigrane plus tard ?",
      answer:
        "Oui si vous l'avez ajouté avec OUTILIA : un marqueur technique permet à « Gérer un filigrane » de le repérer et de le supprimer. Les filigranes posés par d'autres logiciels ne peuvent être retirés que s'ils sont des annotations ou des objets identifiables.",
    },
  ],
  "pdf-search": [
    {
      question: "Pourquoi la recherche ne trouve-t-elle rien dans mon PDF ?",
      answer:
        "Le document est probablement un scan : il contient une image de la page, pas de texte. Passez-le d'abord par l'outil OCR pour obtenir un PDF avec une couche de texte, puis relancez la recherche.",
    },
    {
      question: "Les mots coupés en fin de ligne sont-ils trouvés ?",
      answer:
        "Pas toujours : un mot césuré (« docu-ment ») ou une expression coupée par un retour à la ligne peut échapper à la recherche. Essayez un mot plus court ou une partie de l'expression.",
    },
  ],
  "pdf-crop": [
    {
      question: "Le recadrage supprime-t-il vraiment ce qui est en dehors de la zone ?",
      answer:
        "Non. Il règle la zone d'affichage (CropBox) : le contenu masqué reste dans le fichier et peut être rétabli. Pour supprimer définitivement des informations, utilisez « Caviarder un PDF ».",
    },
    {
      question: "Puis-je appliquer des marges différentes selon les pages ?",
      answer:
        "Les marges sont identiques pour toutes les pages sélectionnées. Pour des recadrages différents, lancez l'outil plusieurs fois en sélectionnant à chaque fois les pages concernées.",
    },
  ],
  "pdf-stamp": [
    {
      question: "Comment numéroter à partir d'un autre numéro que 1 ?",
      answer:
        "Indiquez le numéro de départ dans les options : utile quand le document est un chapitre d'un ensemble plus large. Le modèle {page} / {total} affiche la position et le nombre total de pages.",
    },
    {
      question: "Une numérotation existante est-elle remplacée ?",
      answer:
        "Non : le texte est ajouté par-dessus le contenu. Si le document comporte déjà des numéros au même endroit, les deux se superposent ; choisissez une autre position (coin, centre) ou masquez l'ancienne avec le modificateur.",
    },
  ],
  "pdf-check": [
    {
      question: "Que répare exactement l'outil ?",
      answer:
        "Il réécrit le fichier en reconstruisant les tables de références et les objets mal formés (fins de fichier manquantes, décalages erronés). Il ne peut pas recréer un contenu absent ou tronqué : un fichier amputé reste illisible.",
    },
    {
      question: "Pourquoi un PDF chiffré est-il signalé sans détail ?",
      answer:
        "L'analyse complète exige d'ouvrir le contenu. Déverrouillez d'abord le document avec son mot de passe (« Déverrouiller un PDF »), puis relancez la vérification.",
    },
  ],
  "pdf-metadata": [
    {
      question: "La suppression des métadonnées efface-t-elle toutes les traces ?",
      answer:
        "Elle vide le dictionnaire d'informations et les flux XMP du document et des pages. Les données contenues dans les images (EXIF d'une photo insérée), dans le texte ou dans les annotations restent : pour une anonymisation complète, vérifiez aussi ces éléments.",
    },
    {
      question: "Pourquoi les dates affichées ne correspondent-elles pas à mon fichier ?",
      answer:
        "Ce sont les dates déclarées à l'intérieur du PDF par le logiciel qui l'a produit, pas celles du système de fichiers. Elles peuvent être absentes, dans un autre fuseau, ou volontairement modifiées.",
    },
  ],
  "pdf-links": [
    {
      question: "Les adresses écrites en clair sans lien cliquable sont-elles trouvées ?",
      answer:
        "Oui : l'outil lit les annotations de lien et repère aussi les URL et e-mails présents dans le texte. Une adresse coupée sur deux lignes peut être tronquée, et un document scanné ne contient pas de texte sans OCR.",
    },
    {
      question: "Que deviennent les liens internes ?",
      answer:
        "Les liens vers une autre page du même document sont comptés mais pas listés, puisqu'ils ne pointent vers aucune adresse. L'export TXT ou CSV ne contient que les liens externes.",
    },
  ],
  "pdf-compare": [
    {
      question: "Quelle différence entre le mode texte et le mode visuel ?",
      answer:
        "Le mode texte compare les mots, lignes ou caractères et montre précisément ce qui a changé ; il ignore images et mise en page. Le mode visuel rend les deux pages et compare les pixels : il signale où regarder (images, tampons, décalages) mais ne dit pas quoi a changé.",
    },
    {
      question: "Pourquoi toutes les pages apparaissent-elles modifiées ?",
      answer:
        "Les pages sont comparées par numéro. Une page insérée ou supprimée décale toutes les suivantes, qui semblent alors différentes. Comparez des versions avec la même pagination, ou extrayez les sections concernées avant de comparer.",
    },
  ],
  "image-resize": [
    {
      question: "Puis-je agrandir une image sans la rendre floue ?",
      answer:
        "Non : agrandir n'ajoute aucun détail, le navigateur interpole les pixels existants. L'agrandissement est désactivé par défaut ; activez-le seulement si une taille précise vous est imposée.",
    },
    {
      question: "Comment redimensionner sans déformer ?",
      answer:
        "Utilisez la largeur, la hauteur, le pourcentage ou la taille maximale : les proportions sont conservées. Seul le mode « Exact » impose les deux dimensions et peut déformer l'image si le ratio diffère.",
    },
  ],
  "image-crop": [
    {
      question: "Le recadrage est-il sans perte ?",
      answer:
        "L'image est redécodée puis réenregistrée dans le format choisi : en PNG ou WebP sans perte, les pixels conservés sont identiques ; en JPEG, une recompression s'applique (réglez la qualité en conséquence).",
    },
    {
      question: "Les photos d'iPhone (HEIC) sont-elles acceptées ?",
      answer:
        "Oui : elles sont décodées dans le navigateur par libheif (WebAssembly, chargé à la demande). Le résultat est enregistré en JPEG, PNG ou WebP, formats lisibles partout.",
    },
  ],
  "image-rotate": [
    {
      question: "Pourquoi ma photo est-elle déjà dans le bon sens après import ?",
      answer:
        "L'orientation enregistrée par l'appareil photo (EXIF) est appliquée à l'ouverture. Si une photo s'affiche couchée ailleurs, enregistrez-la ici sans rotation supplémentaire : le fichier produit est physiquement orienté et ne dépend plus de cette métadonnée.",
    },
    {
      question: "Les métadonnées de la photo sont-elles conservées ?",
      answer:
        "Non : les fichiers produits ne contiennent plus les données EXIF (appareil, date, GPS). C'est souvent souhaitable avant une publication ; conservez l'original si vous tenez à ces informations.",
    },
  ],
  "image-watermark": [
    {
      question: "Puis-je utiliser un logo comme filigrane ?",
      answer:
        "Pas encore : l'outil appose un texte (nom, ©, mention) en coin, au centre ou en mosaïque. Pour un logo, superposez-le avec le modificateur PDF après avoir converti l'image en PDF, ou attendez l'ajout annoncé de cette option.",
    },
    {
      question: "Un filigrane empêche-t-il le vol de mes photos ?",
      answer:
        "Il le décourage et identifie l'auteur, mais il peut être recadré ou retouché. Une mosaïque semi-transparente couvrant l'image est plus difficile à retirer qu'une mention dans un coin.",
    },
  ],
  "text-case": [
    {
      question: "Pourquoi certains mots restent-ils en minuscules en format Titre ?",
      answer:
        "Le format Titre suit l'usage français : les mots-outils courants (de, la, le, et, à…) gardent la minuscule, sauf en début de texte. Utilisez « Majuscule à chaque mot » si vous voulez tout capitaliser.",
    },
    {
      question: "Que deviennent les accents en snake_case ou camelCase ?",
      answer:
        "Ces formats techniques retirent les accents et la ponctuation pour produire des identifiants valides (variables, clés). Le texte d'origine n'est pas modifié tant que vous ne copiez pas le résultat.",
    },
  ],
  "text-diff": [
    {
      question: "Quelle granularité choisir ?",
      answer:
        "« Mots » pour relire une version d'un texte, « Lignes » pour du code ou des listes, « Caractères » pour repérer une faute ou un chiffre changé. Le mode lignes est le plus lisible sur de longs documents.",
    },
    {
      question: "Puis-je comparer deux fichiers plutôt que du texte collé ?",
      answer:
        "Oui, chaque zone accepte un fichier texte (.txt, .md, .csv…). Pour deux PDF, utilisez « Comparer deux PDF » qui extrait le texte page par page.",
    },
  ],
  "text-slug": [
    {
      question: "Le slug généré est-il unique ?",
      answer:
        "Non : il est dérivé du titre et deux titres identiques donnent le même slug. L'unicité se vérifie côté site (CMS, base de données), souvent en ajoutant un suffixe numérique.",
    },
    {
      question: "Que deviennent les caractères non latins ?",
      answer:
        "Les lettres accentuées sont translittérées (é → e, ß → ss) ; les alphabets non latins (cyrillique, arabe, chinois) sont retirés. Pour ces langues, rédigez un slug manuel ou en translittération romanisée.",
    },
  ],
  "dev-json": [
    {
      question: "Pourquoi mon JSON avec commentaires est-il refusé ?",
      answer:
        "Le format JSON standard n'autorise ni commentaires, ni virgules finales, ni guillemets simples. L'outil signale ces erreurs avec la ligne et la colonne ; retirez-les ou utilisez un format JSON5/JSONC avec un autre outil.",
    },
    {
      question: "Comment convertir en CSV un JSON imbriqué ?",
      answer:
        "La conversion attend un tableau d'objets plats. Les valeurs imbriquées (objets, tableaux) sont encodées en JSON dans la cellule ; aplatissez vos données avant la conversion si vous avez besoin d'une colonne par champ.",
    },
  ],
  "dev-csv-json": [
    {
      question: "Comment le séparateur est-il choisi ?",
      answer:
        "Il est détecté sur les premières lignes (virgule, point-virgule, tabulation, barre verticale). Si la détection se trompe, par exemple sur un CSV à une seule colonne, choisissez-le manuellement dans les options.",
    },
    {
      question: "Les nombres et dates sont-ils convertis ?",
      answer:
        "Les nombres peuvent être convertis (option) ; les dates restent des chaînes de caractères pour éviter toute interprétation erronée du format (jour/mois ou mois/jour).",
    },
  ],
  "dev-base64": [
    {
      question: "Le Base64 protège-t-il mes données ?",
      answer:
        "Non. C'est un encodage réversible qui représente des octets en texte, pas un chiffrement : n'importe qui peut le décoder. Pour protéger un document, utilisez un mot de passe ou un outil de chiffrement.",
    },
    {
      question: "Quelle est la différence avec la variante URL-safe ?",
      answer:
        "Elle remplace « + » et « / » par « - » et « _ » (et souvent omet le « = » final) pour être utilisable dans une URL ou un nom de fichier. L'outil décode les deux variantes.",
    },
  ],
  "dev-url-encode": [
    {
      question: "Faut-il encoder toute l'URL ou seulement un paramètre ?",
      answer:
        "Seulement les valeurs (paramètres, segments) : encoder une URL complète transformerait aussi « : » et « / ». Choisissez le mode composant pour une valeur, le mode URL pour une adresse entière.",
    },
    {
      question: "Pourquoi les « + » deviennent-ils des espaces au décodage ?",
      answer:
        "C'est la convention des formulaires HTML (application/x-www-form-urlencoded). Si vos « + » sont littéraux, encodez-les en %2B avant de décoder.",
    },
  ],
  "dev-html-entities": [
    {
      question: "L'outil supprime-t-il les balises HTML ?",
      answer:
        "Non : il convertit les caractères spéciaux en entités et inversement, sans toucher aux balises. Pour retirer le HTML d'un texte, utilisez « Nettoyer un texte ».",
    },
    {
      question: "Pourquoi les accents ne sont-ils pas convertis en entités ?",
      answer:
        "En UTF-8, « é » est valide tel quel dans une page HTML ; seuls & < > et les guillemets doivent être échappés. Les entités numériques (&#233;) sont tout de même reconnues au déséchappement.",
    },
  ],
  "dev-uuid": [
    {
      question: "Les UUID générés sont-ils vraiment aléatoires ?",
      answer:
        "Oui : ils proviennent du générateur cryptographique du navigateur (crypto.randomUUID ou getRandomValues), pas d'un pseudo-aléa prévisible. La probabilité de collision est négligeable.",
    },
    {
      question: "Pourquoi seulement la version 4 ?",
      answer:
        "C'est la version la plus utilisée et la seule qui ne dépend d'aucune donnée (horloge, adresse, nom). Les versions 1 et 5 répondent à des besoins spécifiques et ne sont pas proposées.",
    },
  ],
  "dev-hash": [
    {
      question: "Pourquoi MD5 n'est-il pas proposé ?",
      answer:
        "MD5 n'est plus considéré comme sûr et l'API Web Crypto des navigateurs ne le fournit pas. Pour vérifier un téléchargement, préférez SHA-256, aujourd'hui la référence.",
    },
    {
      question: "Pourquoi l'empreinte d'un texte collé diffère-t-elle de celle du fichier ?",
      answer:
        "Un fichier texte se termine souvent par un retour à la ligne, absent du texte collé, et l'encodage peut différer. Hachez le fichier lui-même pour comparer avec une somme publiée.",
    },
  ],
  "dev-regex": [
    {
      question: "Ma regex Python ou PCRE donne-t-elle le même résultat ici ?",
      answer:
        "Pas toujours : la syntaxe est celle de JavaScript (ECMAScript). Quelques différences : pas de \\A ni \\Z, lookbehind limité sur les anciens navigateurs, drapeaux différents. Testez les cas limites.",
    },
    {
      question: "Pourquoi la page se fige-t-elle avec certaines expressions ?",
      answer:
        "Des quantificateurs imbriqués (par exemple (a+)+) provoquent des retours arrière catastrophiques. Simplifiez l'expression ou limitez l'entrée ; l'affichage est de toute façon plafonné à 2 000 correspondances.",
    },
  ],
  "dev-timestamp": [
    {
      question: "Secondes ou millisecondes : comment l'outil décide-t-il ?",
      answer:
        "Une valeur inférieure à 10¹¹ est lue en secondes, au-delà en millisecondes (convention des timestamps JavaScript). Vous pouvez forcer l'unité si votre source est atypique.",
    },
    {
      question: "Quel fuseau est utilisé ?",
      answer:
        "Le fuseau de votre appareil, affiché à côté de la date, avec la version UTC et ISO 8601. Une date saisie sans fuseau est interprétée dans ce fuseau local.",
    },
  ],
  "calc-vat": [
    {
      question: "Pourquoi le total de plusieurs lignes diffère-t-il d'un centime ?",
      answer:
        "Chaque montant est arrondi au centime, comme sur une facture ; la somme des arrondis peut différer d'un centime d'un calcul global. C'est le comportement attendu par la plupart des logiciels de facturation.",
    },
    {
      question: "Quel taux appliquer à mon produit ?",
      answer:
        "La calculatrice propose les taux français (20 %, 10 %, 5,5 %, 2,1 %) et un taux libre, mais ne détermine pas lequel s'applique : cela dépend de la nature du bien ou du service et relève de la réglementation fiscale.",
    },
  ],
  "qr-read": [
    {
      question: "Le QR code n'est pas reconnu : que faire ?",
      answer:
        "Vérifiez que le code est net, bien éclairé, et qu'il occupe une part suffisante de l'image (recadrez si besoin). Un code très incliné, abîmé ou partiellement masqué peut échouer ; reprenez la photo de face.",
    },
    {
      question: "Les codes-barres de produits sont-ils lus ?",
      answer:
        "Non : seuls les QR codes sont décodés. Les codes-barres linéaires (EAN-13, Code 128) et les Data Matrix ne sont pas pris en charge par ce lecteur.",
    },
  ],
  "color-convert": [
    {
      question: "Les valeurs CMYK correspondent-elles à l'impression ?",
      answer:
        "Elles sont une approximation mathématique sans profil ICC. L'imprimeur convertit vos couleurs avec son propre profil : transmettez-lui le HEX ou le RGB et demandez une épreuve.",
    },
    {
      question: "Que signifie le résultat du contraste WCAG ?",
      answer:
        "Le ratio compare la luminance du texte et du fond. Les recommandations demandent au moins 4,5:1 pour le texte courant (niveau AA) et 3:1 pour les grands titres ; 7:1 correspond au niveau AAA.",
    },
  ],
  "image-palette": [
    {
      question: "Pourquoi la couleur de mon logo n'apparaît-elle pas ?",
      answer:
        "Les couleurs sont des moyennes de zones : une teinte peu étendue, même importante visuellement, peut être absorbée par les couleurs voisines. Recadrez l'image sur le logo pour l'isoler.",
    },
    {
      question: "Les couleurs extraites sont-elles exactes ?",
      answer:
        "L'image est réduite à 320 px et regroupée en zones dominantes : les valeurs sont représentatives, pas pixel-exactes. Pour une couleur précise, utilisez une pipette dans un logiciel d'image.",
    },
  ],
  "doc-text-pdf": [
    {
      question: "Comment conserver les alignements d'un listing ou d'un tableau texte ?",
      answer:
        "Choisissez la police Courier (à chasse fixe) : chaque caractère a la même largeur, les colonnes alignées à l'espace restent alignées. Réduisez la taille si les lignes sont longues.",
    },
    {
      question: "Puis-je mettre des titres en gras ?",
      answer:
        "Pas dans cet outil, qui reproduit le texte brut. Utilisez « Markdown vers PDF » : # pour les titres, ** pour le gras, listes et tableaux.",
    },
  ],
  "doc-paper": [
    {
      question: "Pourquoi les carreaux ne font-ils pas exactement 5 mm à l'impression ?",
      answer:
        "La plupart des pilotes d'impression appliquent un « ajustement à la page » qui réduit légèrement le document. Imprimez à 100 % (taille réelle) pour conserver les dimensions.",
    },
    {
      question: "Le Seyès proposé convient-il à l'apprentissage de l'écriture ?",
      answer:
        "Le modèle suit l'écartement standard de 8 mm des cahiers courants. Les variantes agrandies pour les débutants (gros Seyès 3 mm, 4 mm) ne sont pas proposées pour l'instant.",
    },
  ],
  "doc-calendar": [
    {
      question: "Quels jours fériés sont marqués ?",
      answer:
        "Les jours fériés légaux français, avec l'option Alsace-Moselle (Vendredi saint, Saint-Étienne). Les vacances scolaires et les fêtes locales ne sont pas incluses.",
    },
    {
      question: "Puis-je y ajouter mes rendez-vous ?",
      answer:
        "Le calendrier est vierge et imprimable : notez vos rendez-vous à la main ou annotez le PDF dans le modificateur. Il ne se synchronise avec aucun agenda en ligne.",
    },
  ],
  "doc-cover": [
    {
      question: "Puis-je ajouter un logo ou une image ?",
      answer:
        "Pas dans cet outil, qui propose une mise en page unique et sobre. Créez la page de garde, puis insérez le logo avec le modificateur PDF (outil image) avant de fusionner avec votre document.",
    },
    {
      question: "Comment l'assembler avec mon document ?",
      answer:
        "Téléchargez la page de garde, puis utilisez « Fusionner des PDF » en la plaçant en première position. Dans le modificateur, « Insérer un PDF » permet aussi de l'ajouter directement.",
    },
  ],
};
