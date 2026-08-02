import { SPRITE_ICONS, SPRITE_ID_PREFIX, spriteHref, type SpriteIconName } from "@/lib/icon-sprite";

/**
 * Declare une fois les dessins des icones repetees. A rendre UNE seule fois par
 * page, n'importe ou dans le document : un <use> resout son ancre a l'echelle du
 * document entier, pas de son voisinage.
 *
 * Rationale et mesure : voir src/lib/icon-sprite.ts.
 *
 * Les attributs de trace vivent sur le <symbol> plutot que sur chaque <svg>
 * appelant : c'est ce qui rend l'appelant minuscule, et ce qui garantit qu'une
 * icone se dessine pareil partout ou elle est utilisee.
 */
export function IconSprite() {
  const names = Object.keys(SPRITE_ICONS) as SpriteIconName[];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      // display:none suffit et evite que le sprite occupe la moindre place ou
      // decale la mise en page. Les <symbol> ne sont de toute facon jamais rendus
      // directement, seulement clones par les <use>.
      style={{ display: "none" }}
    >
      {names.map((name) => {
        const icon = SPRITE_ICONS[name];
        return (
          <symbol
            key={name}
            id={`${SPRITE_ID_PREFIX}${name}`}
            viewBox={icon.viewBox}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dangerouslySetInnerHTML={{ __html: icon.body }}
          />
        );
      })}
    </svg>
  );
}

/**
 * Une icone du sprite. Remplace un <Icone /> de lucide-react partout ou la meme
 * icone est rendue en boucle, et s'utilise pareil : <SpriteIcon name="map-pin"
 * className="w-3 h-3" />.
 *
 * Decoratif par defaut, donc masque aux lecteurs d'ecran : ces icones doublent
 * toujours un texte visible dans les cartes. Passer un `title` quand l'icone
 * porte a elle seule une information.
 */
export function SpriteIcon({
  name,
  className,
  title,
}: {
  name: SpriteIconName;
  className?: string;
  title?: string;
}) {
  return (
    <svg className={className} aria-hidden={title ? undefined : "true"} focusable="false" role={title ? "img" : undefined}>
      {title ? <title>{title}</title> : null}
      <use href={spriteHref(name)} />
    </svg>
  );
}
