# <img alt="Data FAIR logo" src="https://cdn.jsdelivr.net/gh/data-fair/data-fair@master/public/assets/logo.svg" width="40"> @data-fair/metrics

*A service to help monitoring HTTP requests in the data-fair stack.*

## NEXT

Je propose d'utiliser ce service comme bac à sable pour la modernisation de notre stack. Plus tard on pourra adopter bout par bout les meilleurs éléments de recette dans les services plus importants.

La motivation:
  - il faut moderniser à interval régulier, pas le choix
  - progresser sur la sécurité
  - progresser sur la performance
  - progresser sur l'élasticité de l'infra
  - tirer les leçons des dernières années d'expérience, prendre du recul sur les éléments les moins satisfaisants de nos recettes

Plusieurs raisons pour le choix de ce service en particulier:

  - petite api
  - petite ui
  - petit worker (réception des logs par UDP)
  - place non critique dans l'infra

Les grandes lignes de ce que je veux essayer:

  - vue/nuxt/vuetify 3
    - ce ne sont plus des betas, il va bien falloir s'y mettre
  
  - typescript côté UI et API
    - je ne suis pas encore certain d'être convaincu, mais l'idée d'apporter un peu de fiabilité à notre code me plait
  
  - séparation des livrables docker UI / API / Worker
    - plus faciles à optimiser
    - plus faciles à sécuriser
    - plus rapides à builder
    - meilleure utilisation des ressources dans infra élastique (par exemple on peut scale l'api de manière plus importante que l'ui, nuxt est lourd en mémoire et avec le SSR désactivé il n'a pas forcément besoin de scale car il bénéficie énormément du cache sur le reverse proxy, avec le SSR activé comme pour portals c'est probablement tout l'inverse)
    - plus maintenables (moins de code spaguetti, meilleure lisibilité des dépendances, moins de code un peu "hacké" autour de l'intégration de nuxt dans le serveur)
    - possibilité d'adopter une stack complètement différente (à commencer par Rust pour la partie réception des logs)
    - on garde un seul repo et un seul cycle de vie
  
  - adoption d'images distroless
    - plus léger
    - plus sécurisé
  
  - possibilité de produire des variantes d'image "debug" pour éviter de compromettre les images de prod sans sacrifier notre capacité à diagnostiquer les problèmes sur environnement réel, par exemple:
    - API nodejs lancée par nodemon directement sur le code source typescript + shell, VI et curl
    - worker Rust compilé en mode debug + shell et gdb
    - nuxt avec sourcemap et warnings de dev activés
    - pour la légèreté du build et l'utilisation du disque chez ghcr.io ces images devraient être buildées uniquement à la demande, ou alors n'avoir que 1 tag avec uniquement la dernière version release

  - package manager nodejs: je propose d'utiliser pnpm
    - après test on gagne environ 10% par rapport à npm sur les dépendances de prod de data-fair
    - encore un petit peu plus efficace que yarn
    - je préfère la structure non plate : plus facile à explorer et impossible de charger un module qui n'est pas explicitement dans les dépendances

  - en dev on lance un docker-compose avec un nginx qui sert de frontal (data-fair fonctionne déjà comme ça en partie)
    - remplace avantageusement l'utilisation de proxies de dev dans le code de l'api
    - permet de tester des comportements réalistes de l'api derrière un reverse proxy (cache, buffering, compression, etc)
    - le docker-compose de dev pourrait inclure le nodemon de l'api et l'appel de "nuxt run" de cette manière on reviendrait à une commande unique pour lancer tout l'environnement de dev. En allant un plus loin on pourrait recommander de lancer les commandes de dev comme "npm install", "cargo build" et autres directement dans les conteneurs de dev, on réduit les pré-requis pour les contributeurs, on supprime les problèmes de version node, etc. Tout ça parait pas mal, il faut juste vérifier qu'on a bien la même fluidité dans le dev au quotidien, ça reste la priorité.

  - simplification du routage HTTP
    - initialement j'étais convaincu qu'il valait mieux qu'un conteneur serve sur / et que le préfixe soit uniquement l'affaire du reverse proxy, je reviens sur cette opinion ça a été source de beaucoup de complexité. Si on inclut le basePath dans la config du conteneur et que celui-ci l'applique en préfixe de toutes ses routes :
    - on évite de nombreuses instructions d'url rewriting
    - on reconstruit plus facilement l'URL (avec header.host + req.originalUrl)
    - on colle beaucoup mieux au paramètre baseUrl de nuxt
    - le simple fait que ce soit le comportement normal de nginx et qu'une configuration peu lisible d'url rewriting est nécessaire pour notre approche actuelle doit suffir à mettre la puce à l'oreille

  - séparation plus claire entre tests d'intégration et tests unitaires
    - tests unitaires optionnels dans le répertoire de chaque livrable (qui peuvent continué à être exécutés comme une étape du build docker pour alléger les pré-requis dans l'environnement de build)
    - tests d'intégration basés sur les images docker buildés (on test le vrai livrable) et eux même exécutés dans un conteneur du docker-compose de dev
    - on peut continuer à écrire les tests d'intégration en nodejs

  - structure plus légère à la racine grâce au découpage des livrables
    - manifeste package.json principal contenant la version et peut-être les commandes racines de test, dev, build (sauf si toutes ces commandes deviennent des commandes docker-compose à la place)
    - README, licence, etc
    - répertoires ui, api au minimum et selon les services worker, doc, contract, etc
