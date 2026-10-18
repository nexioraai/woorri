// LES 6 SMART BLOCKS v1 — composites DE PRIMITIVES exclusivement (D-023).
// RÈGLE MÉCANISÉE (tests/etancheite-ratchet.test.ts) : tout le visuel passe
// par @deribfy/primitives — Y COMPRIS LA LISTE, depuis le 2026-10-05. Ce
// fichier n'importe RIEN de react-native : c'est ce qui le rend partageable
// entre le natif et le web. AUCUN StyleSheet, AUCUN style en dur — le moteur
// de styling reste remplaçable (D-021) et les tokens restent la seule
// source visuelle. AUCUNE syntaxe Maestro/Detox : les blocs sont
// E2E-agnostiques (D-022/D-023), seuls les testID standard sont exposés.
import {Liste, GridCard, AppButton, AvatarInitiales, Barre,
  AppText,
  Badge,
  ListRow,
  Section,
  StateView,
  AppImage,
  TextField, ListFooter, SearchEntry, Rangee} from "@deribfy/primitives";
import type {Blocks,
  ProseBlockProps,
  ButtonBlockProps,
  DetailHeaderBlockProps,
  EmptyStateBlockProps,
  FormBlockProps,
  HeaderBlockProps,
  ListBlockProps,
  SpacerBlockProps, SearchEntryBlockProps, GraphiqueBlockProps, AgentBlockProps,
  StatistiquesBlockProps, StatistiqueItem} from "./contracts.ts";

export function HeaderBlock({
  title,
  subtitle,
  surtitre,
  accroche,
  logoUri,
  titreContinu,
  testID,
}: HeaderBlockProps) {
  return (
    <Section testID={testID}>
      {logoUri === undefined ? null : (
        // WCAG 1.1.1 (niveau A) : une image porte un equivalent textuel. Le
        // nom vient du DOCUMENT — le titre de l'ecran — jamais d'une chaine
        // inventee ici. Mesure du 2026-10-12 : 124 appels sur 124 n'en
        // passaient aucun, donc aucune image generee n'etait nommee.
        <AppImage
          uri={logoUri}
          variant="brand"
          accessibilityLabel={title}
          testID={`${testID ?? "header"}-brand`}
        />
      )}
      {/* 1.7.0 — une ACCROCHE monte d'un cran typographique. Le bloc choisit
          un RÔLE, la primitive porte la forme : aucun style ici. */}
      {/* SURTITRE (2026-10-17) — la ligne qui SITUE, au-dessus du titre.
          Chez Bolt : PILOTAGE, JOURNAL FINANCIER, COMMUNAUTE. Trois niveaux,
          pas deux. Le bloc choisit un ROLE, la primitive porte la forme :
          aucun style ici, aucune casse imposee — le document ecrit le texte. */}
      {surtitre !== undefined && (
        <AppText variant="label" tone="muted">
          {surtitre}
        </AppText>
      )}
      {/* ── LE TITRE QUI SE POURSUIT (2026-10-18) — D8 chez Bolt.
          « Bonjour Aminata, » en gras suivi de « voici votre espace. » en
          gris, SUR LA MEME LIGNE. Le vocabulaire existait — `title` et
          `subtitle` — mais la FORME n etait que « l un sous l autre ».
          LE DOCUMENT LE DIT par `titreContinu` ; le moteur ne le devine pas.
          « Votre tontine en un coup d oeil » colle a « Mon tableau de bord »
          serait illisible : seul celui qui ecrit les deux parties sait si
          elles forment une phrase. */}
      <AppText
        variant={accroche === true ? "display" : "heading"}
        {...(subtitle !== undefined && titreContinu === true ? { suite: subtitle } : {})}
      >
        {title}
      </AppText>
      {subtitle !== undefined && titreContinu !== true && (
        <AppText tone="muted">{subtitle}</AppText>
      )}
    </Section>
  );
}

export function ListBlock({
  title,
  items,
  state = { kind: "ready" },
  search,
  filters,
  onItemPress,
  layout,
  bounded,
  seeAll,
  testID,
  avatarInitiales,
  badgeForme,
}: ListBlockProps) {
  // DET-033 (jugement propriétaire sur appareil) : les états ne remplacent
  // plus le BLOC ENTIER — ils ne remplacent que la ZONE DE CONTENU. Avant,
  // une saisie sans correspondance faisait rendre l'état vide À LA PLACE du
  // champ de recherche : le champ disparaissait sous les doigts, clavier
  // fermé. Recherche et filtres restent MONTÉS quel que soit l'état, et
  // vivent DANS la liste (en-tête défilant) : une seule surface de
  // défilement, plus deux régions étanches.
  const etatContenu =
    state.kind === "loading" ? (
      <StateView state="loading" title={state.title} />
    ) : state.kind === "empty" ? (
      <StateView state="empty" title={state.title} message={state.message} />
    ) : state.kind === "error" ? (
      <StateView
        state="error"
        title={state.title}
        message={state.message}
        actionLabel={state.retryLabel}
        onAction={state.onRetry}
      />
    ) : null;
  // Contrôles TOUJOURS montés (élément stable : l'identité du TextField
  // survit aux rendus — le focus et le clavier survivent avec elle).
  // FIXES depuis 2026-09-10 (jugement propriétaire sur capture) : la
  // recherche et les filtres restent SOUS LE TITRE pendant que le contenu
  // défile — patron des applications de référence. DET-033 reste tenu :
  // montés quel que soit l'état, l'état ne remplace que la zone de contenu.
  // Seule la POSITION change : région fixe, plus en-tête défilant.
  const controles = (
    <>
      {search === undefined ? null : (
        <TextField
          testID={`${testID ?? "list"}-search`}
          // DET-033 : champ compact — le sens passe par `placeholder`, la
          // ligne de libellé disparaît, l'accessibilité garde son nom.
          label=""
          accessibilityLabel={search.placeholder}
          placeholder={search.placeholder}
          value={search.value}
          onChangeText={search.onChange}
        />
      )}
      {/* E1 (D-129) — filtres pilotés : la saisie appartient à l'appelant. */}
      {(filters ?? []).map((f, i) =>
        f.inputType === "text" ? (
          <TextField
            key={`${testID ?? "list"}-filter-${String(i)}`}
            testID={`${testID ?? "list"}-filter-${String(i)}`}
            label={f.label}
            value={f.value}
            onChangeText={f.onChange}
          />
        ) : (
          // DET-034 : un filtre n'est pas une action — les options sont des
          // CHIPS (visuel de badge, cible tactile intacte), la rangée perd son
          // titre VISIBLE (la hiérarchie revient à la recherche) mais garde son
          // nom pour l'accessibilité, et l'état sélectionné se dit.
          <Section
            key={`${testID ?? "list"}-filter-${String(i)}`}
            accessibilityLabel={f.label}
            inline
          >
            {(f.options ?? []).map((option) => (
              <AppButton
                key={option}
                testID={`${testID ?? "list"}-filter-${String(i)}-${option}`}
                // DET-032 : le libellé peut différer de la VALEUR — le testID,
                // le filtrage et onChange restent sur l'option brute.
                label={f.optionLabels?.[option] ?? option}
                kind="chip"
                selected={f.value === option}
                onPress={() => {
                  f.onChange(f.value === option ? "" : option);
                }}
              />
            ))}
          </Section>
        ),
      )}
    </>
  );
  if (bounded === true && layout !== "row") {
    // APERÇU BORNÉ (mission composition II) — la liste COULE dans un écran
    // composé : pas de liste virtualisée (DET-006 : jamais de virtualisée non bornée
    // dans un ScrollView), pas de fill. L'appelant a déjà tronqué les items ;
    // « Voir plus » emmène au complet. États et contrôles : mêmes règles.
    const rangees: (typeof items)[] = [];
    if (layout === "grid") {
      for (let i = 0; i < items.length; i += 2) rangees.push(items.slice(i, i + 2));
    }
    return (
      <Section title={title} testID={testID} titleAction={seeAll}>
        {controles}
        {etatContenu ??
          (layout === "grid" ? (
            rangees.map((paire) => (
              <Rangee key={paire[0]?.id ?? "r"}>
                {paire.map((item) => (
                  <GridCard
                    key={item.id}
                    title={item.title}
                    subtitle={item.subtitle}
                    trailing={item.trailing}
                    badge={item.badge}
                    badgeTone={item.badgeTone === undefined || item.badgeTone === "neutral" ? undefined : item.badgeTone}
                    imageUri={item.imageUri}
                    onPress={
                      onItemPress === undefined
                        ? undefined
                        : () => {
                            onItemPress(item.id);
                          }
                    }
                    testID={`${testID ?? "list"}-card-${item.id}`}
                  />
                ))}
              </Rangee>
            ))
          ) : (
            items.map((item) => (
              <ListRow
                key={item.id}
                leading={
                  item.imageUri !== undefined ? (
                    <AppImage uri={item.imageUri} variant="thumb" accessibilityLabel={item.title} />
                  ) : avatarInitiales === true ? (
                    // REPLI, PAS REMPLACEMENT : l image prime toujours. Et le
                    // document DIT que ces lignes sont des personnes — le
                    // moteur ne le devine pas, un catalogue afficherait sinon
                    // « CB » pour « Collier baoule ».
                    <AvatarInitiales nom={item.title} testID={`${testID ?? "list"}-avatar-${item.id}`} />
                  ) : undefined
                }
                title={item.title}
                subtitle={item.subtitle}
                trailing={item.trailing}
                badge={item.badge}
                {...(badgeForme === undefined ? {} : { badgeForme })}
                badgeTone={item.badgeTone === undefined || item.badgeTone === "neutral" ? undefined : item.badgeTone}
                onPress={
                  onItemPress === undefined
                    ? undefined
                    : () => {
                        onItemPress(item.id);
                      }
                }
                testID={`${testID ?? "list"}-row-${item.id}`}
              />
            ))
          ))}
      </Section>
    );
  }
  if (layout === "row") {
    // RANGÉE HORIZONTALE (mission composition, 2026-09-10) — la section d'un
    // accueil-fleuve : axe PERPENDICULAIRE au défilement de l'écran, donc
    // hauteur naturelle, pas de `fill`, et DET-006 hors sujet. Les états
    // restent scopés au contenu (DET-033).
    return (
      <Section title={title} testID={testID} titleAction={seeAll}>
        {controles}
        {etatContenu ?? (
          <Liste
            horizontal
            donnees={state.kind === "ready" ? items : []}
            clef={(item) => item.id}
            rendu={(item) => (
              <GridCard
                compact
                title={item.title}
                subtitle={item.subtitle}
                trailing={item.trailing}
                badge={item.badge}
                badgeTone={item.badgeTone === undefined || item.badgeTone === "neutral" ? undefined : item.badgeTone}
                imageUri={item.imageUri}
                onPress={
                  onItemPress === undefined
                    ? undefined
                    : () => {
                        onItemPress(item.id);
                      }
                }
                testID={`${testID ?? "list"}-card-${item.id}`}
              />
            )}
          />
        )}
      </Section>
    );
  }
  return (
    // `fill` (DET-006) : la section BORNE la hauteur de la liste virtualisée.
    // Sans parent borné, la liste rend tous ses éléments. L'intention est
    // DÉCLARÉE ici ; le style reste entièrement porté par les primitives —
    // la contrainte « aucun StyleSheet, aucun style en dur » est préservée.
    <Section title={title} testID={testID} fill titleAction={seeAll}>
      {controles}
      <Liste
        // GRILLE (1.20) : deux colonnes de cartes pour un catalogue. La clé
        // force la liste à se recréer si la disposition changeait — React
        // Native refuse de passer de une à deux colonnes sur une liste déjà
        // montée. Elle est posée ICI, par l'appelant : une clé ne se transmet
        // PAS par une prop, React l'extrait à la création de l'élément.
        key={layout === "grid" ? "grid" : "rows"}
        colonnes={layout === "grid" ? 2 : 1}
        // DET-016 (D-039, dimension A étendue) : ajustement au clavier. Le
        // DÉTAIL de plateforme — quelle propriété, sur quel système — vit
        // désormais dans la primitive : c'est elle qui est remplaçable par
        // cible, pas le bloc.
        // DET-033 : recherche et filtres vivent EN-TÊTE DE LISTE — une seule
        // surface de défilement — et l'état (chargement/vide/erreur) ne
        // remplace que la zone de contenu.
        suitLeClavier
        vide={etatContenu}
        pied={ListFooter}
        donnees={state.kind === "ready" ? items : []}
        clef={(item) => item.id}
        rendu={(item) =>
          layout === "grid" ? (
            <GridCard
              title={item.title}
              subtitle={item.subtitle}
              trailing={item.trailing}
              badge={item.badge}
              badgeTone={item.badgeTone === undefined || item.badgeTone === "neutral" ? undefined : item.badgeTone}
              imageUri={item.imageUri}
              onPress={
                onItemPress === undefined
                  ? undefined
                  : () => {
                      onItemPress(item.id);
                    }
              }
              testID={`${testID ?? "list"}-card-${item.id}`}
            />
          ) : (
          <ListRow
            // VIGNETTE (1.2.0, D-087) : `leading` existait deja au contrat de
            // la primitive. Sans `imageUri`, la ligne reste celle de 1.1.0.
            //
            // DEUX CHEMINS DE RENDU, ET J AI CABLE LE MAUVAIS D ABORD
            // (2026-10-17). `ListBlock` rend ses lignes de DEUX facons : la
            // carte `items.map` ci-dessus, employee quand la liste est BORNEE
            // (l apercu), et cette liste virtualisee, employee partout
            // ailleurs. J ai pose l avatar sur la premiere ; le montage a
            // rendu 16 lignes et ZERO rond. C est la cinquieme fois que ce
            // depot voit « une liste ecrite deux fois diverge » — le controle
            // ⑥ d EP-262 exige desormais que les deux chemins s accordent.
            leading={
              item.imageUri !== undefined ? (
                <AppImage uri={item.imageUri} variant="thumb" accessibilityLabel={item.title} />
              ) : avatarInitiales === true ? (
                <AvatarInitiales nom={item.title} testID={`${testID ?? "list"}-avatar-${item.id}`} />
              ) : undefined
            }
            title={item.title}
            subtitle={item.subtitle}
            trailing={item.trailing}
            badge={item.badge}
            {...(badgeForme === undefined ? {} : { badgeForme })}
                badgeTone={item.badgeTone === undefined || item.badgeTone === "neutral" ? undefined : item.badgeTone}
            onPress={
              onItemPress === undefined
                ? undefined
                : () => {
                    onItemPress(item.id);
                  }
            }
            testID={`${testID ?? "list"}-row-${item.id}`}
          />
          )
        }
      />
    </Section>
  );
}

export function FormBlock({
  title,
  fields,
  values,
  onChangeField,
  submitLabel,
  onSubmit,
  state = "ready",
  errorMessage,
  fieldErrors,
  loadingTitle,
  emptyTitle,
  testID,
}: FormBlockProps) {
  // REGISTRE 1.1.0 (D-060) : `loading` et `empty` entrent dans l'union. Comme
  // ailleurs, un état sans titre DÉCLARÉ n'est pas rendu — le moteur n'invente
  // aucun texte (F3).
  if (state === "loading" && loadingTitle !== undefined) {
    return <StateView state="loading" title={loadingTitle} testID={testID} />;
  }
  if (state === "empty" && emptyTitle !== undefined) {
    return <StateView state="empty" title={emptyTitle} testID={testID} />;
  }
  return (
    <Section title={title} testID={testID}>
      {fields.map((field) => (
        <TextField
          key={field.id}
          label={field.label}
          placeholder={field.placeholder}
          secure={field.secure}
          value={values[field.id] ?? ""}
          onChangeText={(v) => {
            onChangeField(field.id, v);
          }}
          error={fieldErrors?.[field.id]}
          testID={`${testID ?? "form"}-field-${field.id}`}
        />
      ))}
      {state === "error" && errorMessage !== undefined && (
        <AppText tone="error" testID={`${testID ?? "form"}-error`}>
          {errorMessage}
        </AppText>
      )}
      {/* 1.6.0 — le bouton DIT si l'action est possible. Un champ obligatoire
          vide rendait le bouton actif : il promettait une écriture que la
          validation refusait ensuite EN SILENCE. La couleur porte désormais
          l'information, et `accessibilityState.disabled` la dit aussi. */}
      <AppButton
        label={submitLabel}
        onPress={onSubmit}
        disabled={fields.some((f) => f.required === true && (values[f.id] ?? "").trim() === "")}
        loading={state === "submitting"}
        testID={`${testID ?? "form"}-submit`}
      />
    </Section>
  );
}

// ESPACE EXTENSIBLE (1.8.0). Le bloc DECLARE une intention de mise en page ;
// la primitive porte la forme. Le cliquet d'etancheite reste tenu : aucun
// style ici. Commentaire volontairement sans accents ni tournure longue — la
// sonde F3 cherche des chaines linguistiques par motif et ne distingue pas un
// commentaire (lecon deja consignee sur l'en-tete de detail).
export function SearchEntryBlock({ placeholder, onPress, visual, testID }: SearchEntryBlockProps) {
  return (
    <Section>
      <SearchEntry placeholder={placeholder} onPress={onPress} visual={visual} testID={testID} />
    </Section>
  );
}

export function SpacerBlock({ testID }: SpacerBlockProps) {
  return <Section testID={testID} fill />;
}

/**
 * TEXTE SUIVI (1.14.0, EP-198) — la mise en page d'un texte que le DOCUMENT
 * porte. Le compilateur n'écrit pas une ligne de ce contenu (F3) : il le
 * dispose. `brouillon` n ajoute AUCUN mot ici non plus : il marque le bloc
 * pour le rendu, et le document reste seul a nommer.
 */
export function ProseBlock({ paragraphs, title, brouillon, testID }: ProseBlockProps) {
  return (
    <Section testID={testID} accessibilityLabel={title}>
      {title === undefined ? null : <AppText variant="heading">{title}</AppText>}
      {paragraphs.map((p, i) => (
        <AppText key={`${testID ?? "prose"}-p${String(i)}`} tone={brouillon === true ? "muted" : "default"}>
          {p}
        </AppText>
      ))}
    </Section>
  );
}

/**
 * GRAPHIQUE (2026-10-13) — la classe que DEUX cahiers reclamaient.
 *
 * Le bloc choisit un ROLE, la primitive porte la forme : aucun style ici, le
 * cliquet d'etancheite reste tenu. Il ne CALCULE que la proportion — le
 * maximum de la serie — et n'ecrit AUCUN texte : les etiquettes et les
 * valeurs affichees viennent du document (F3).
 *
 * Un maximum nul ou negatif donne des barres vides plutot qu'une division par
 * zero. Une serie entierement a zero est une information, pas une erreur.
 */
export function GraphiqueBlock({
  title,
  series,
  state = { kind: "ready" },
  testID,
}: GraphiqueBlockProps) {
  if (state.kind === "loading") {
    return <StateView state="loading" title={state.title} testID={testID} />;
  }
  if (state.kind === "empty") {
    return (
      <StateView state="empty" title={state.title} message={state.message} testID={testID} />
    );
  }
  if (state.kind === "error") {
    return (
      <StateView state="error" title={state.title} message={state.message} testID={testID} />
    );
  }
  const max = series.reduce((m, p) => (p.value > m ? p.value : m), 0);
  return (
    <Section title={title} testID={testID}>
      {series.map((p, i) => (
        <Barre
          key={`${testID ?? "graphique"}-${String(i)}`}
          label={p.label}
          valeur={p.display}
          ratio={max > 0 ? p.value / max : 0}
          testID={`${testID ?? "graphique"}-barre-${String(i)}`}
        />
      ))}
    </Section>
  );
}

/**
 * STATISTIQUES (2026-10-17) — LE CHIFFRE QUI OUVRE UN TABLEAU DE BORD.
 *
 * CE QUI A COMMANDE CE BLOC : comparaison avec Bolt, detail par detail. Son
 * tableau de bord de tontine ouvre sur QUATRE cartes — solde, cotisations
 * collectees, membres actifs, prochaine echeance. Libelle discret, grand
 * nombre, legende qui le situe. Deribfy ne savait dessiner que sept formes,
 * et aucune n etait celle-la.
 *
 * CE QU IL NE FAIT PAS (F3) : il ne formate rien. `valeur` arrive ecrite.
 *
 * LE TON RESOUT LES JETONS SEMANTIQUES QUE RIEN N EMPLOYAIT : `success` et
 * `error` existent dans les 44 tokens, et aucun bloc ne les utilisait. La
 * couleur ne disait donc jamais si un montant entre ou sort. `ton` le dit,
 * et le moteur n en choisit pas la teinte.
 *
 * SANS APOSTROPHES NI ACCENTS, comme les autres commentaires de ce fichier :
 * le cliquet F3 extrait les chaines par leurs delimiteurs, et une apostrophe
 * francaise en ouvre une fausse. Convention mesuree, pas un gout.
 */
export function StatistiquesBlock({
  title,
  items,
  state = { kind: "ready" },
  testID,
}: StatistiquesBlockProps) {
  if (state.kind === "loading") {
    return <StateView state="loading" title={state.title} testID={testID} />;
  }
  if (state.kind === "empty") {
    return (
      <StateView state="empty" title={state.title} message={state.message} testID={testID} />
    );
  }
  if (state.kind === "error") {
    return (
      <StateView state="error" title={state.title} message={state.message} testID={testID} />
    );
  }
  return (
    <Section title={title} testID={testID}>
      <Rangee>
        {items.map((it, i) => (
          <CarteChiffre
            key={`${testID ?? "stat"}-${String(i)}`}
            item={it}
            testID={`${testID ?? "stat"}-item-${String(i)}`}
          />
        ))}
      </Rangee>
    </Section>
  );
}

/** Une carte. Separee pour que la grille reste lisible, et parce qu un
 *  composant qui fait deux choses se corrige deux fois. */
function CarteChiffre({ item, testID }: { item: StatistiqueItem; testID: string }) {
  const tonBadge =
    item.ton === "positif"
      ? "success"
      : item.ton === "negatif"
        ? "error"
        : item.ton === "attention"
          ? "warn"
          : undefined;
  return (
    <GridCard
      compact
      title={item.valeur}
      subtitle={item.label}
      testID={testID}
      {...(item.legende === undefined ? {} : { trailing: item.legende })}
      {...(tonBadge === undefined ? {} : { badge: item.valeur, badgeTone: tonBadge })}
    />
  );
}

/**
 * AGENT (2026-10-13) — le bouton, et la parole.
 *
 * Decision du proprietaire : chaque utilisateur a ce bouton ; qui veut s'en
 * servir l'active et lui parle, a la voix ou en ecrivant.
 *
 * Le bloc ne PENSE rien et n'INVENTE aucun mot : libelles, invite, resume et
 * reponse viennent tous de l'appelant, donc du document (F3). Il compose des
 * primitives, sans un seul style — le cliquet d'etancheite reste tenu.
 *
 * FERME PAR DEFAUT : avant ouverture, seul le bouton existe. Un agent qui
 * ecouterait sans reveil serait exactement ce que personne ne veut dune
 * machine qui agit. Commentaire volontairement sans apostrophes : la sonde
 * F3 cherche des chaines linguistiques par motif et ne distingue pas un
 * commentaire du code.
 */
export function AgentBlock({
  label,
  placeholder,
  open,
  onToggle,
  value,
  onChangeText,
  onSend,
  reply,
  voice,
  awaitingConfirmation,
  state = { kind: "ready" },
  testID,
}: AgentBlockProps) {
  if (!open) {
    return (
      <Section tight>
        <AppButton label={label} onPress={onToggle} testID={testID} />
      </Section>
    );
  }
  if (state.kind === "loading") {
    return <StateView state="loading" title={state.title} testID={testID} />;
  }
  if (state.kind === "error") {
    return (
      <StateView state="error" title={state.title} message={state.message} testID={testID} />
    );
  }
  // UN GESTE IRREVERSIBLE NE PART PAS SANS ACCORD. Le resume dit ce qui va
  // se passer ; les deux issues sont EXPLICITES, jamais un seul bouton
  // « continuer » qui se clique par reflexe.
  if (awaitingConfirmation !== undefined) {
    return (
      <Section testID={testID}>
        <AppText>{awaitingConfirmation.summary}</AppText>
        <AppButton
          label={awaitingConfirmation.confirmLabel}
          onPress={awaitingConfirmation.onConfirm}
          testID={`${testID ?? "agent"}-confirmer`}
        />
        <AppButton
          label={awaitingConfirmation.cancelLabel}
          kind="link"
          onPress={awaitingConfirmation.onCancel}
          testID={`${testID ?? "agent"}-annuler`}
        />
      </Section>
    );
  }
  return (
    <Section testID={testID}>
      <TextField
        label=""
        accessibilityLabel={placeholder}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        testID={`${testID ?? "agent"}-saisie`}
      />
      {voice === undefined ? null : (
        <AppButton
          label={voice.label}
          kind={voice.listening ? "primary" : "chip"}
          onPress={voice.onToggle}
          testID={`${testID ?? "agent"}-voix`}
        />
      )}
      <AppButton
        label={label}
        onPress={onSend}
        disabled={value.trim() === ""}
        testID={`${testID ?? "agent"}-envoyer`}
      />
      {reply === undefined ? null : <AppText>{reply}</AppText>}
    </Section>
  );
}

export function ButtonBlock({ label, icon, kind, onPress, testID }: ButtonBlockProps) {
  // MESURE SUR APPAREIL : ce bloc rendait le bouton NU, donc collé aux bords
  // de l'ecran — seul bloc a ne pas passer par `Section`, qui porte les
  // marges de tous les autres. La difference se voyait a l'oeil et nulle
  // part ailleurs. Le bloc declare un ROLE, la primitive porte la forme.
  return (
    // Le `testID` reste sur l'ELEMENT PRESSABLE : sondes d'affordance et
    // selecteurs de campagne le ciblent. Le poser sur la Section aurait
    // casse les deux sans rien apporter.
    // UN LIEN N'EST PAS UNE ACTION DE BLOC (1.18.0) : il ne prend pas la
    // respiration d'un bloc. Mesure a l'ecran — « Mot de passe oublie »
    // flottait a ~62 dp du bouton d'envoi, deux sections empilant leurs
    // marges. Le bloc declare le ROLE, la primitive resserre.
    <Section tight={kind === "link"}>
      <AppButton label={label} icon={icon} kind={kind} onPress={onPress} testID={testID} />
    </Section>
  );
}

export function EmptyStateBlock({
  title,
  message,
  actionLabel,
  onAction,
  testID,
}: EmptyStateBlockProps) {
  return (
    <StateView
      state="empty"
      title={title}
      message={message}
      actionLabel={actionLabel}
      onAction={onAction}
      testID={testID}
    />
  );
}

export function DetailHeaderBlock({
  title,
  subtitle,
  badges,
  trailing,
  state = { kind: "ready" },
  imageUri,
  testID,
}: DetailHeaderBlockProps) {
  // REGISTRE 1.1.0 (D-060) : les trois états que la dimension C nomme. Titres
  // issus des DONNÉES — aucun texte moteur (F3).
  if (state.kind === "loading") {
    return <StateView state="loading" title={state.title} testID={testID} />;
  }
  if (state.kind === "empty") {
    return (
      <StateView state="empty" title={state.title} message={state.message} testID={testID} />
    );
  }
  if (state.kind === "error") {
    return (
      <StateView state="error" title={state.title} message={state.message} testID={testID} />
    );
  }
  return (
    <Section testID={testID}>
      {/* VISUEL D'EN-TETE (1.2.0, D-087). Le style vit dans la PRIMITIVE : le
          cliquet d'etancheite interdit tout style ici, et il a raison — le bloc
          choisit un ROLE, la primitive choisit la forme. Commentaire volontai-
          rement sans accents ni phrase longue : le cliquet F3 cherche des
          chaines linguistiques par motif et ne distingue pas un commentaire. */}
      {imageUri === undefined ? null : (
        <AppImage
          uri={imageUri}
          variant="header"
          accessibilityLabel={title}
          testID={`${testID ?? "detail"}-image`}
        />
      )}
      <AppText variant="heading">{title}</AppText>
      {subtitle !== undefined && <AppText tone="muted">{subtitle}</AppText>}
      {trailing !== undefined && (
        <AppText variant="title" tone="primary">
          {trailing}
        </AppText>
      )}
      {/* CLÉ STABLE (D-076) — `key={badge}` collait deux badges de même valeur,
          et React refusait : « two children with the same key `` ». Le cas réel
          était deux champs de badge VIDES. La position rend la clé unique par
          construction, quelles que soient les valeurs. */}
      {badges?.map((badge, i) => <Badge key={`${String(i)}:${badge}`} label={badge} />)}
    </Section>
  );
}

// Conformité au contrat vérifiée par le compilateur (patron 3.2 / banc P-003).
export const blocks: Blocks = {
  HeaderBlock,
  ListBlock,
  SearchEntryBlock,
  FormBlock,
  ButtonBlock,
  EmptyStateBlock,
  DetailHeaderBlock,
  SpacerBlock,
  ProseBlock,
  GraphiqueBlock,
  StatistiquesBlock,
  AgentBlock,
};
