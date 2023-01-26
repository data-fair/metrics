# <img alt="Data FAIR logo" src="https://cdn.jsdelivr.net/gh/data-fair/data-fair@master/public/assets/logo.svg" width="40"> @data-fair/metrics

*A service to help monitoring the data-fair stack.*

## NEXT

Je propose d'utiliser ce service comme bac à sable pour la modernisation de notre stack. Plus tard on pourra adopter bout par bout les meilleurs éléments de recette dans les services plus importants. Plusieurs raison pour la choix de ce service:

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

  - en dev on lance un docker-compose avec un nginx qui sert de frontal (data-fair fonctionne déjà comme ça en partie)
    - remplace avantageusement l'utilisation de proxies de dev dans le code de l'api
    - permet de tester des comportements réalistes de l'api derrière un reverse proxy (cache, buffering, compression, etc)
    - le docker-compose de dev pourrait peut-être inclure le nodemon de l'api et l'appel de "nuxt run" de cette manière on reviendrait à une commande unique pour lancer tout l'environnement de dev

  - structure plus légère à la racine grâce au découpage des livrables
    - manifeste package.json principal contenant la version et les commandes racines de test, dev, build, etc
    - README, licence, etc
    - répertoires ui, api au minimum et selon les services worker, doc, contract, etc