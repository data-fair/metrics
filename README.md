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
  
  - révision du build docker
    - après multiples hésitations je pense continuer sur les images alpine
      - distroless peut amener beaucoup de complexité au build
      - une image debian aurait pas mal d'avantages et le poid important ne serait pas un énorme souci si on réutilise bien les images de base, mais concrètement justement je ne veux pas qu'on se sente contraint de tout le temps upgraade tous les services quand on upgrade l'image de base d'un service, avoir une couche de base légère est intéressant quand il y a un peu d'hétérogénéité dans les dockerfile
      - il y a plein d'arguments dans tous les sens, dans le doute on va conserver l'approche existante et ne pas se compliquer la vie
    - pour la réduction du node_modules on peut comparer clean-modules, ncc et docker-slim
      - en fonction de ce choix l'adoption de pnpm devient peut-être inutile et on pourrait revenir au standard npm (dans les sous-projets le champ version de package.json ne change pas donc le découpage de pnpm fetch / install n'est pas utile)
  
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
    - trouver une solution qui n'implique pas d'url rewriting systématique par nginx ni de match sur regexp
    - de la même manière pas de bricolage bizarre du basePath dans nuxt
   
  - ne plus utiliser le module originalUrl pour le multi-domaine, il utilise trop de headers différents et nous expose à de la manipulation
    - à la place utiliser explicitement le header host et c'est tout

  - séparation plus claire entre tests d'intégration et tests unitaires
    - tests unitaires optionnels dans le répertoire de chaque livrable (qui peuvent continuer à être exécutés comme une étape du build docker pour alléger les pré-requis dans l'environnement de build)
    - tests d'intégration obligatoires basés sur les images docker buildées (on test le vrai livrable)
    - on peut continuer à écrire les tests d'intégration en nodejs quelque soit la nature du livrable

  - structure plus légère à la racine grâce au découpage des livrables
    - manifeste package.json principal contenant la version et peut-être les commandes racines de test, dev, build (sauf si toutes ces commandes deviennent des commandes docker-compose à la place)
    - README, licence, etc
    - répertoires ui, api au minimum et selon les services worker, doc, contract, etc

  - meilleure consommation des logs nginx
    - socker unix sur chaque noeud au lieu de port UDP ouvert à l'exétieur
    - daemonset écrit en rust pour une faible conso de resources
    - en rust on devra manipuler du JSON et soit on le fait de manière très générique (https://docs.rs/json/latest/json/) soit c'est l'occasion de tester la génération de code JTD (https://github.com/jsontypedef/json-typedef-codegen)