const express = require('express');
const path = require('path');
const fs = require('fs');

app = express();

// Middleware pentru a prelua IP-ul și a-l face disponibil în toate vederile EJS
app.use(function(req, res, next) {
    // Luăm IP-ul. Express oferă req.ip, dar putem fi mai specifici:
    let ip = req.headers['x-forwarded-for'] || 
             req.socket.remoteAddress || 
             null;

    // Tratăm cazul localhost IPv6 (::1) pentru a fi mai lizibil, opțional
    if (ip === "::1") {
        ip = "127.0.0.1 (localhost)";
    }
    
    // Curățăm prefixul ::ffff: care apare uneori la adrese IPv4 hibride
    if (ip && ip.includes("::ffff:")) {
        ip = ip.replace("::ffff:", "");
    }

    // Salvăm IP-ul în res.locals. 
    // Orice proprietate din res.locals este vizibilă direct în fișierele .ejs
    res.locals.ipUtilizator = ip;

    next(); // Trecem la următoarea funcție (ruta efectivă)
});

app.set('view engine', 'ejs');
console.log("Folder index.js", __dirname);
console.log("Folder curent (de lucru)", process.cwd());
console.log("Cale fisier", __filename);

obGlobal={
    obErori:null,
    obImagini:null,
    folderScss: path.join(__dirname,"resurse/scss"),
    folderCss: path.join(__dirname,"resurse/css"),
    folderBackup: path.join(__dirname,"backup"),
    optiuniMeniu:null,
    protocol:"http://",
    numeDomeniu:"localhost:8080",
    clientMongo:null,
    bdMongo:null
}

vect_foldere=["temp"]
for (let folder of vect_foldere ){
    let caleFolder=path.join(__dirname,folder)
    if (! fs.existsSync(caleFolder)){
        fs.mkdirSync(caleFolder);
    }
}

app.use("/resurse", express.static(path.join(__dirname, "resurse")));
app.get("/favicon.ico", function(req, res){
    res.sendFile(path.join(__dirname, "resurse/imagini/favicon/favicon.ico"))
})

app.get(["/index", "/","/home"], function(req, res){
    res.render("pagini/index");
})

// app.get(["/alta-pagina"], function(req, res){
//     res.render("pagini/alta-pagina", {nume:"Eugen" });
// })

function initErori(){
    let continut = fs.readFileSync(path.join(__dirname,"resurse/json/erori.json")).toString("utf-8");
    console.log(continut)
    obGlobal.obErori=JSON.parse(continut)
    console.log(obGlobal.obErori)
    
    let err_default=obGlobal.obErori.eroare_default
    err_default.imagine=path.join(obGlobal.obErori.cale_baza, obGlobal.obErori.eroare_default.imagine)
    for (let eroare of obGlobal.obErori.info_erori){
        eroare.imagine=path.join(obGlobal.obErori.cale_baza, eroare.imagine)
    }
    console.log(obGlobal.obErori)

}

initErori()

function initImagini(){
    var continut= fs.readFileSync(path.join(__dirname,"resurse/json/galerie.json")).toString("utf-8");

    obGlobal.obImagini=JSON.parse(continut);
    let vImagini=obGlobal.obImagini.imagini;

    let caleAbs=path.join(__dirname,obGlobal.obImagini.cale_galerie);
    let caleAbsMediu=path.join(__dirname,obGlobal.obImagini.cale_galerie, "mediu");
    if (!fs.existsSync(caleAbsMediu))
        fs.mkdirSync(caleAbsMediu);

    //for (let i=0; i< vErori.length; i++ )
    for (let imag of vImagini){
        [numeFis, ext]=imag.fisier.split("."); //"ceva.png" -> ["ceva", "png"]
        let caleFisAbs=path.join(caleAbs,imag.fisier);
        let caleFisMediuAbs=path.join(caleAbsMediu, numeFis+".webp");
        sharp(caleFisAbs).resize(300).toFile(caleFisMediuAbs);
        imag.fisier_mediu=path.join("/", obGlobal.obImagini.cale_galerie, "mediu",numeFis+".webp" )
        imag.fisier=path.join("/", obGlobal.obImagini.cale_galerie, imag.fisier )
        
    }
    console.log(obGlobal.obImagini)
}
// initImagini();

function afisareEroare(res, identificator, titlu, text, imagine){
    let eroare= obGlobal.obErori.info_erori.find(function(elem){ 
                        return elem.identificator==identificator
                    });
    if(eroare){
        if(eroare.status)
            res.status(identificator)
        var titluCustom=titlu || eroare.titlu;
        var textCustom=text || eroare.text;
        var imagineCustom=imagine || eroare.imagine;


    }
    else{
        var err=obGlobal.obErori.eroare_default
        var titluCustom=titlu || err.titlu;
        var textCustom=text || err.text;
        var imagineCustom=imagine || err.imagine;


    }
    res.render("pagini/eroare", { //transmit obiectul locals
        titlu: titluCustom,
        text: textCustom,
        imagine: imagineCustom
})

}

app.get("/*pagina", function(req, res){
    console.log(req.url);
    if (path.extname(req.url)==".ejs"){
            afisareEroare(res, 400);        
        }
        else if (req.url.startsWith("/resurse") && path.extname(req.url)==""){
            afisareEroare(res, 403); 
        }
        else{
            console.log("Extensia:", path.extname(req.url))
            console.log("Parsare:", path.parse(req.url))
            res.render("pagini"+req.url, function(err, rezultatRandare){
                // console.log("Eroare:",err.message);

                if (err && err.message.startsWith("Failed to lookup view")){
                    afisareEroare(res, 404)

                }
                else{
                    console.log("Succes:", rezultatRandare);
                    res.send(rezultatRandare);
                }
                    
            });
        }
});

app.listen(8080);