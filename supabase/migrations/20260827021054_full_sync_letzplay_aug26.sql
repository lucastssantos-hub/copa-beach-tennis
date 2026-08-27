-- Espelho integral das inscricoes do LetzPlay conferido em 26/08/2026.
-- O perfil do LetzPlay + categoria identifica cada inscricao.
create temporary table sync_letzplay_source (
  category_name text not null,
  team_name text not null,
  athlete_name text not null,
  letzplay_profile text not null
) on commit drop;

insert into sync_letzplay_source
  (category_name, team_name, athlete_name, letzplay_profile)
values
  ('40+', 'Paraguai', 'Karina Farah', 'https://letzplay.me/KarinaFarah'),
  ('40+', 'Paraguai', 'Mariane Ziliotto', 'https://letzplay.me/MarianeZiliotto'),
  ('40+', 'Paraguai', 'Camilo Cabral', 'https://letzplay.me/CamiloCabral'),
  ('40+', 'Paraguai', 'Thiago Alfredo Pereira da Silva', 'https://letzplay.me/ThiagoSilva4'),
  ('40+', 'Paraguai', 'Guilherme Valias Schmitt', 'https://letzplay.me/GuilhermeSchmitt4'),
  ('40+', 'Paraguai', 'Sonyangela Imai Rossi', 'https://letzplay.me/SonyangelaRossi'),
  ('40+', 'Cabo Verde', 'Luiz Lepri Jr', 'https://letzplay.me/Luizleprijr'),
  ('40+', 'Cabo Verde', 'Everton Hernandes', 'https://letzplay.me/EvertonHernandes'),
  ('40+', 'Portugal', 'Andressa Spessatto', 'https://letzplay.me/AndressaSpessatto'),
  ('40+', 'Portugal', 'Vanessa Nava', 'https://letzplay.me/VanessaNava2'),
  ('40+', 'Portugal', 'Fábio Spessatto', 'https://letzplay.me/Fabiospessatto1'),
  ('40+', 'Portugal', 'Renato Sabatini', 'https://letzplay.me/RenatoSabatini'),
  ('40+', 'Argentina', 'Marco Mori', 'https://letzplay.me/MarcoMori'),
  ('40+', 'Argentina', 'Rogerio Arida', 'https://letzplay.me/Arida'),
  ('40+', 'Argentina', 'Cris Kloster', 'https://letzplay.me/criskloster'),
  ('40+', 'Argentina', 'Gulherme Kloster', 'https://letzplay.me/GuilhermeKloster'),
  ('40+', 'Argentina', 'Joao Carlos', 'https://letzplay.me/JoaoCarlosRossetim'),
  ('40+', 'Argentina', 'Fernanda Ferrari Gameiro', 'https://letzplay.me/FernandaGameiro'),
  ('40+', 'Argentina', 'Fabiana Paiva', 'https://letzplay.me/FabianaPaiva1'),
  ('40+', 'Noruega', 'Patty Nascimento', 'https://letzplay.me/PattyNascimento'),
  ('40+', 'Noruega', 'Daniela Lara Lara', 'https://letzplay.me/DanielaLaraLara'),
  ('40+', 'Noruega', 'Hugo Okuma', 'https://letzplay.me/HugoOkuma1'),
  ('40+', 'Noruega', 'Thiago Garcia', 'https://letzplay.me/ThiagoGarcia07'),
  ('40+', 'Aruba', 'Alex Eiras', 'https://letzplay.me/Alexeiras1'),
  ('40+', 'Aruba', 'Adriele Almeida Ribeiro', 'https://letzplay.me/AdrieleJanainadeAlmeidaRibeiro'),
  ('40+', 'Aruba', 'Marcos Versuti', 'https://letzplay.me/marcosversutiloreto'),
  ('40+', 'Aruba', 'Alessandra Ziliotto', 'https://letzplay.me/AlessandraZiliotto'),
  ('40+', 'Aruba', 'Marcelo Silva', 'https://letzplay.me/MarceloSilva261'),
  ('40+', 'USA', 'Dheferson Ribeiro', 'https://letzplay.me/DhefersonRibeiro'),
  ('40+', 'USA', 'Paula Daltro Nogueira do Prado', 'https://letzplay.me/PaulaNogueiraPrado'),
  ('40+', 'USA', 'Dayani Noriduki', 'https://letzplay.me/DayaniNoriduki'),
  ('40+', 'USA', 'Diogo Marchi', 'https://letzplay.me/DiogoMarchi'),
  ('60+', 'Argentina', 'Rafaela Lenardon', 'https://letzplay.me/RafaelaLenardon'),
  ('60+', 'Argentina', 'Carolina Genofre', 'https://letzplay.me/CarolinaVecchiaGenofre'),
  ('60+', 'Argentina', 'Cris Kloster', 'https://letzplay.me/criskloster'),
  ('60+', 'Argentina', 'Fabiana Paiva', 'https://letzplay.me/FabianaPaiva1'),
  ('60+', 'Argentina', 'Diogo Diornellas', 'https://letzplay.me/DiornellasDiogo'),
  ('60+', 'Argentina', 'Leandro Proença', 'https://letzplay.me/LeandroProenca'),
  ('60+', 'Argentina', 'Joao Carlos', 'https://letzplay.me/JoaoCarlosRossetim'),
  ('60+', 'Argentina', 'Celso Duarte', 'https://letzplay.me/CelsoDuarte'),
  ('60+', 'Paraguai', 'Alberto Vinícius Rodrigues Lima', 'https://letzplay.me/AlbertoViniciusLima'),
  ('60+', 'Paraguai', 'Daniel Felipe Faleiro', 'https://letzplay.me/DanielFaleiro'),
  ('60+', 'Paraguai', 'Guilherme Valias Schmitt', 'https://letzplay.me/GuilhermeSchmitt4'),
  ('60+', 'Paraguai', 'Faena Gabriela Ehlers', 'https://letzplay.me/faenaehlers'),
  ('60+', 'Paraguai', 'Karina Farah', 'https://letzplay.me/KarinaFarah'),
  ('60+', 'Paraguai', 'Sonyangela Imai Rossi', 'https://letzplay.me/SonyangelaRossi'),
  ('60+', 'Cabo Verde', 'Viviane Macedo Ribeiro', 'https://letzplay.me/VivianeRibeiro8'),
  ('60+', 'Cabo Verde', 'Grilo .', 'https://letzplay.me/Grilo'),
  ('60+', 'Cabo Verde', 'Suellen Aymore', 'https://letzplay.me/SuellenAymore'),
  ('60+', 'Cabo Verde', 'William Oliveira', 'https://letzplay.me/WiliamOliver'),
  ('60+', 'Portugal', 'Dayane Noda Kondo Rolim', 'https://letzplay.me/DayaneRolim'),
  ('60+', 'Portugal', 'Edgar Martins', 'https://letzplay.me/EdgarMartins'),
  ('60+', 'Portugal', 'Alana Homrich', 'https://letzplay.me/AlanaHomrich'),
  ('60+', 'Portugal', 'André Pinheiro Machado Roos', 'https://letzplay.me/AndreRoos'),
  ('60+', 'Portugal', 'Pedro Lucas', 'https://letzplay.me/PedroGoncalves17'),
  ('60+', 'USA', 'Ana Flávia Lopes', 'https://letzplay.me/AnaLopes25'),
  ('60+', 'USA', 'Gislaine Camargo', 'https://letzplay.me/GislaineCamargo1'),
  ('60+', 'USA', 'Amanda Mazini', 'https://letzplay.me/AmandaMazini'),
  ('60+', 'USA', 'João Calado', 'https://letzplay.me/JoaoCalado3'),
  ('60+', 'USA', 'Rafael Nadal', 'https://letzplay.me/RafaelNadal7'),
  ('60+', 'USA', 'Amnon Felipe', 'https://letzplay.me/amnonpasetofelipe'),
  ('60+', 'USA', 'Diogo Marchi', 'https://letzplay.me/DiogoMarchi'),
  ('60+', 'Noruega', 'Bruno Okuma', 'https://letzplay.me/BrunoOkuma'),
  ('60+', 'Noruega', 'Marcio Moreto', 'https://letzplay.me/MarcioMoreto1'),
  ('60+', 'Noruega', 'Lilian Francisco', 'https://letzplay.me/LilianFrancisco2'),
  ('60+', 'Noruega', 'Giselle Correia', 'https://letzplay.me/GiselleCorreia'),
  ('60+', 'Aruba', 'Felipe Jardim', 'https://letzplay.me/FelipeJardim5'),
  ('60+', 'Aruba', 'Gabriel Motta', 'https://letzplay.me/GabrielMotta8'),
  ('60+', 'Aruba', 'Carol Soares', 'https://letzplay.me/CarolinaSoares8'),
  ('60+', 'Aruba', 'Carlos Correia', 'https://letzplay.me/CarlosAlbertoCorreia'),
  ('60+', 'Aruba', 'Emilia Coutto', 'https://letzplay.me/EmiliaCoutto'),
  ('60+', 'Aruba', 'Sthefani Depieri', 'https://letzplay.me/SthefaniDepieri'),
  ('60+', 'Aruba', 'Alex Eiras', 'https://letzplay.me/Alexeiras1'),
  ('E', 'Paraguai', 'Fellipe Roncholeta', 'https://letzplay.me/FELLIPER3'),
  ('E', 'Paraguai', 'Pietro Lepri', 'https://letzplay.me/PietroLepri'),
  ('E', 'Paraguai', 'Rafael Jeremias', 'https://letzplay.me/RafaelCruz36'),
  ('E', 'Paraguai', 'Ana Carolina Gazim', 'https://letzplay.me/AnaGazim'),
  ('E', 'Paraguai', 'Jocimara Freitas', 'https://letzplay.me/JocimaraFreitas1'),
  ('E', 'Paraguai', 'Larissa Loyola Barbosa', 'https://letzplay.me/LarissaBarbosa12'),
  ('E', 'Paraguai', 'Mariana Dalmagro', 'https://letzplay.me/MarianaDalmagro'),
  ('E', 'Paraguai', 'Matheus Alves', 'https://letzplay.me/alves_matheus'),
  ('E', 'Cabo Verde', 'Gustavo Alencar', 'https://letzplay.me/SEPGustavoAlencar'),
  ('E', 'Cabo Verde', 'Livia Fanhani', 'https://letzplay.me/LiviaFanhani'),
  ('E', 'Cabo Verde', 'Enzo Martins Nelli', 'https://letzplay.me/EnzoNelli3'),
  ('E', 'Cabo Verde', 'Gustavo Pizaia', 'https://letzplay.me/Gustavopizaia2'),
  ('E', 'Cabo Verde', 'Livia Queiros Lopes', 'https://letzplay.me/liviaLopes26'),
  ('E', 'Cabo Verde', 'Guto Bento', 'https://letzplay.me/GutoBento'),
  ('E', 'Cabo Verde', 'Isabelli Franzo', 'https://letzplay.me/Isabellifranzo'),
  ('E', 'Portugal', 'Fabiana De Paula', 'https://letzplay.me/FabianaPaula5'),
  ('E', 'Portugal', 'Maiara Kelm Martins', 'https://letzplay.me/MaiaraMartins2'),
  ('E', 'Portugal', 'Erica Tristao', 'https://letzplay.me/EricaTristao'),
  ('E', 'Portugal', 'Renan Kenzo Barreto Yamamoto', 'https://letzplay.me/renankenzoo'),
  ('E', 'Portugal', 'Miguel Bufara', 'https://letzplay.me/MiguelBufara'),
  ('E', 'Portugal', 'Vinicius Fernandes', 'https://letzplay.me/ViniciusFernandes48'),
  ('E', 'Brasil', 'Fernando Bukovski', 'https://letzplay.me/FernandoBukovski1'),
  ('E', 'Brasil', 'Jamille Goncalves', 'https://letzplay.me/JamilleFreitas'),
  ('E', 'Brasil', 'Nagila Morais', 'https://letzplay.me/NagilaMorais'),
  ('E', 'Brasil', 'Gustavo Felipe', 'https://letzplay.me/Gustavofelipe12'),
  ('E', 'Brasil', 'Ricardo Ortega Rodrigues', 'https://letzplay.me/RicardoOrtegaRodrigues'),
  ('E', 'Brasil', 'Gabriel Cerezini', 'https://letzplay.me/GabrielCerezini'),
  ('E', 'Brasil', 'Nicolle Ohara', 'https://letzplay.me/nicolle_ohara'),
  ('E', 'Brasil', 'Pedro Augusto Lopes Chaves', 'https://letzplay.me/Pedroaugustochaves'),
  ('E', 'Argentina', 'Danilo Rodrigues', 'https://letzplay.me/DaniloRodrigues37'),
  ('E', 'Argentina', 'Bruna Furio Marques Yano', 'https://letzplay.me/BrunaYano'),
  ('E', 'Argentina', 'Harumi Chimada Yano', 'https://letzplay.me/Harumi'),
  ('E', 'Argentina', 'Sidney Matheus', 'https://letzplay.me/SidneyMatheus'),
  ('E', 'Argentina', 'Allan Minato', 'https://letzplay.me/AllanMinato'),
  ('E', 'Argentina', 'Vitoria Atsuio Yano', 'https://letzplay.me/VitoriaAtsuioYano'),
  ('E', 'Noruega', 'Igor De Oliveira', 'https://letzplay.me/IgorOliveira'),
  ('E', 'Noruega', 'Eduardo Garcia', 'https://letzplay.me/Eduardocatabriga'),
  ('E', 'Noruega', 'Maria Clara Sugigan', 'https://letzplay.me/MariaClaraSugigan'),
  ('E', 'Noruega', 'Carolina Neta', 'https://letzplay.me/CarolinaNeta'),
  ('E', 'Noruega', 'Yasmin Ávila Mistrello', 'https://letzplay.me/YasminMistrello'),
  ('E', 'Noruega', 'Gabriel Lopes', 'https://letzplay.me/GabrielLopes33'),
  ('E', 'Noruega', 'Gabriel Galdino', 'https://letzplay.me/GabrielGaldino4'),
  ('E', 'Aruba', 'Gabriela Bernardelli', 'https://letzplay.me/GabrielaBernardelli1'),
  ('E', 'Aruba', 'Monica Motta', 'https://letzplay.me/MonicaMottaSouza'),
  ('E', 'Aruba', 'Miguel Moreira', 'https://letzplay.me/MiguelMoreira03'),
  ('E', 'Aruba', 'Guilherme Zimmermann', 'https://letzplay.me/guilhermeZimmermann4'),
  ('E', 'Aruba', 'Livia Bernardelli', 'https://letzplay.me/LiviaBernardelli1'),
  ('E', 'Aruba', 'Miguel Corsini', 'https://letzplay.me/MiguelCorsini2'),
  ('E', 'Aruba', 'Caio Belli', 'https://letzplay.me/caiobelli'),
  ('E', 'Aruba', 'Miguel Struckel', 'https://letzplay.me/MiguelStruckel1'),
  ('E', 'USA', 'Joás Vieira', 'https://letzplay.me/JoasVieira'),
  ('E', 'USA', 'Windson Lima', 'https://letzplay.me/WindsonLima'),
  ('E', 'USA', 'Vinícius Hoffmann', 'https://letzplay.me/MarcosViniciusHoffmann'),
  ('E', 'USA', 'Vitoria Batista', 'https://letzplay.me/VitoriaBatista2'),
  ('E', 'USA', 'Camilla Obo', 'https://letzplay.me/camillaobo'),
  ('E', 'USA', 'Pamela Sampaio', 'https://letzplay.me/Pamelasampaio'),
  ('D', 'Paraguai', 'Emilena Piffer', 'https://letzplay.me/EmilenaPiffer'),
  ('D', 'Paraguai', 'Rafael Corradini', 'https://letzplay.me/RafaelCorradini'),
  ('D', 'Paraguai', 'Veiga .', 'https://letzplay.me/Veigamxz'),
  ('D', 'Paraguai', 'Fernanda Lira Rodrigues Souza', 'https://letzplay.me/FernandaSouza69'),
  ('D', 'Paraguai', 'Camila Albertini', 'https://letzplay.me/CamilaSilva127'),
  ('D', 'Paraguai', 'Milla Barizon', 'https://letzplay.me/Millabarizon'),
  ('D', 'Paraguai', 'Marco Drugovich', 'https://letzplay.me/MarcoDrugovich'),
  ('D', 'Cabo Verde', 'Lorenzo Marques', 'https://letzplay.me/lorenzoMarques6'),
  ('D', 'Cabo Verde', 'Patrícia Gomes', 'https://letzplay.me/PatriciaGomes7'),
  ('D', 'Cabo Verde', 'Fernanda Proença', 'https://letzplay.me/FernandaProenca'),
  ('D', 'Cabo Verde', 'Gustavo Shira', 'https://letzplay.me/Shira'),
  ('D', 'Cabo Verde', 'William Oliveira', 'https://letzplay.me/WiliamOliver'),
  ('D', 'Cabo Verde', 'Beatriz Rosada', 'https://letzplay.me/BeatrizRosada'),
  ('D', 'Cabo Verde', 'Pietro Lepri', 'https://letzplay.me/PietroLepri'),
  ('D', 'Cabo Verde', 'Laila Maria', 'https://letzplay.me/LailaMaria'),
  ('D', 'Portugal', 'Edgar Martins', 'https://letzplay.me/EdgarMartins'),
  ('D', 'Portugal', 'Fatima Santos', 'https://letzplay.me/FatimaSantos4'),
  ('D', 'Portugal', 'Georgia Bufara', 'https://letzplay.me/GeorgiaBufara2'),
  ('D', 'Portugal', 'Cíntia Bresciani', 'https://letzplay.me/CintiaSibert'),
  ('D', 'Portugal', 'Bernardo Inocente', 'https://letzplay.me/BInocente'),
  ('D', 'Portugal', 'Robson Willians', 'https://letzplay.me/RobsonWilliansbt'),
  ('D', 'Brasil', 'Taila Alher', 'https://letzplay.me/tailaalher'),
  ('D', 'Brasil', 'Jessica De Souza da Silva', 'https://letzplay.me/Jessicasilva116'),
  ('D', 'Brasil', 'Victoria Carolini', 'https://letzplay.me/victoriacarolini'),
  ('D', 'Brasil', 'Miranda G', 'https://letzplay.me/Gmirandaa'),
  ('D', 'Brasil', 'Wesley Lima', 'https://letzplay.me/Wesleylima12'),
  ('D', 'Brasil', 'Rafael Storti', 'https://letzplay.me/RafaelStorti1'),
  ('D', 'Brasil', 'Marcelo Augusto Rodrigues', 'https://letzplay.me/MarcelooBigode'),
  ('D', 'Argentina', 'Naiara Gomes', 'https://letzplay.me/NaiaraGomes2'),
  ('D', 'Argentina', 'Paula Da Silva', 'https://letzplay.me/PAULASILVA44'),
  ('D', 'Argentina', 'Kadu Borba', 'https://letzplay.me/CarlosRezende12'),
  ('D', 'Argentina', 'Gustavo Pontes', 'https://letzplay.me/Gustavopontes11'),
  ('D', 'Argentina', 'Thiago Turci', 'https://letzplay.me/ThiagoTurci'),
  ('D', 'Argentina', 'Mateus Tavares', 'https://letzplay.me/mateustavares2012'),
  ('D', 'Argentina', 'Rayane Costa', 'https://letzplay.me/RayaneCosta2'),
  ('D', 'Noruega', 'Luanna Ribas', 'https://letzplay.me/Luannaribas'),
  ('D', 'Noruega', 'Lorena Martins Baia', 'https://letzplay.me/LorenaMartinsbaia'),
  ('D', 'Noruega', 'Ana Paula da Silva Souza', 'https://letzplay.me/AnaSouza71'),
  ('D', 'Noruega', 'Gisele Azevedo', 'https://letzplay.me/GiseleDuarte2'),
  ('D', 'Noruega', 'Kader Ferraresi', 'https://letzplay.me/kaderferraresi'),
  ('D', 'Noruega', 'Marcos Queiroz', 'https://letzplay.me/MarcosQueiroz'),
  ('D', 'Noruega', 'Bruno Okuma', 'https://letzplay.me/BrunoOkuma'),
  ('D', 'Noruega', 'Alexis Prado Constantinopolos', 'https://letzplay.me/Alexispolos'),
  ('D', 'Aruba', 'Felipe Barcaro', 'https://letzplay.me/FelipeBarcaro1'),
  ('D', 'Aruba', 'Miguel Aguiar', 'https://letzplay.me/MiguelAguiar5'),
  ('D', 'Aruba', 'Maria Beatriz', 'https://letzplay.me/MariaCeranto'),
  ('D', 'Aruba', 'Maria Eloisa', 'https://letzplay.me/MariaEloisaceranto1'),
  ('D', 'Aruba', 'Brenda Ferrari', 'https://letzplay.me/BrendaFerrari'),
  ('D', 'Aruba', 'Pedro Malheiro', 'https://letzplay.me/PedroHenriqueMalheiro1'),
  ('D', 'Aruba', 'Miguel Struckel', 'https://letzplay.me/MiguelStruckel1'),
  ('D', 'USA', 'Fabio Gustavo', 'https://letzplay.me/FabioGustavo1'),
  ('D', 'USA', 'João Guilherme De Matos', 'https://letzplay.me/JoaoGuilhermedeMatos'),
  ('D', 'USA', 'Mateus Verhalen Corrêa', 'https://letzplay.me/MateusCorrea5'),
  ('D', 'USA', 'Renata Rufato', 'https://letzplay.me/RenataRufato'),
  ('D', 'USA', 'Nicole Asse', 'https://letzplay.me/NicoleAsse'),
  ('D', 'USA', 'Pietra Lorenza Barreto Lima Silva', 'https://letzplay.me/pietraLorenza5'),
  ('D', 'USA', 'Pedro Moreira', 'https://letzplay.me/PedroMoreira33'),
  ('C', 'Paraguai', 'Thiago Alfredo Pereira da Silva', 'https://letzplay.me/ThiagoSilva4'),
  ('C', 'Paraguai', 'Edcleide Alves Lima', 'https://letzplay.me/EdcleideLima'),
  ('C', 'Paraguai', 'Carolina Milanezi Bortolon', 'https://letzplay.me/CarolBortolon'),
  ('C', 'Paraguai', 'Maira Frasson Cordeiro', 'https://letzplay.me/MairaCordeiro'),
  ('C', 'Paraguai', 'Murilo Viza', 'https://letzplay.me/MuriloViza1'),
  ('C', 'Paraguai', 'Camila Botelho Camargo Crupinsqui', 'https://letzplay.me/CamilaBotelho'),
  ('C', 'Paraguai', 'Ricardo Pariz Franciscatto', 'https://letzplay.me/RicardoFranciscatto'),
  ('C', 'Cabo Verde', 'Talitha Lunardelli', 'https://letzplay.me/TalithaLunardelli'),
  ('C', 'Cabo Verde', 'Mariana Caparroz', 'https://letzplay.me/MarianaCaparroz1'),
  ('C', 'Cabo Verde', 'Jefferson De Macedo', 'https://letzplay.me/JeffersonDeMacedo'),
  ('C', 'Cabo Verde', 'Tiago Tomaz da Rosa', 'https://letzplay.me/TiagoRosa11'),
  ('C', 'Cabo Verde', 'Andréia Teixeira', 'https://letzplay.me/AndreiaSantos9'),
  ('C', 'Cabo Verde', 'Léo Xavier', 'https://letzplay.me/Leoxavierr'),
  ('C', 'Portugal', 'Rick Barbosa', 'https://letzplay.me/RickBarbosa'),
  ('C', 'Portugal', 'Guilherme Ferro', 'https://letzplay.me/GuilhermeFerro1'),
  ('C', 'Portugal', 'Renan André Pereira', 'https://letzplay.me/Renanbey'),
  ('C', 'Portugal', 'Malu Mondadori', 'https://letzplay.me/MaluMondadori'),
  ('C', 'Portugal', 'Poline Wilke', 'https://letzplay.me/PolineWilke1'),
  ('C', 'Brasil', 'Amanda Felix', 'https://letzplay.me/Amandafelix6'),
  ('C', 'Brasil', 'Pamela Franco', 'https://letzplay.me/paamfranco'),
  ('C', 'Brasil', 'Jéssika Machado', 'https://letzplay.me/JessikaMachado'),
  ('C', 'Brasil', 'Renato Meireles Pereira', 'https://letzplay.me/RenatoPereira31'),
  ('C', 'Brasil', 'Jonathan Silva Santos', 'https://letzplay.me/JonathanSantos11'),
  ('C', 'Brasil', 'Felipe Carvalho', 'https://letzplay.me/FelipeCarvalho07'),
  ('C', 'Brasil', 'Kaue Silva', 'https://letzplay.me/KaueSilva12'),
  ('C', 'Argentina', 'Lays Vedovoto', 'https://letzplay.me/LaysVedovoto'),
  ('C', 'Argentina', 'Pablo Pietro', 'https://letzplay.me/PabloPietro'),
  ('C', 'Argentina', 'Estefânia Castelini', 'https://letzplay.me/EstefaniaCastelini'),
  ('C', 'Argentina', 'Paola Sander', 'https://letzplay.me/PaolaSander'),
  ('C', 'Argentina', 'Heide Kondo', 'https://letzplay.me/HeideKondo'),
  ('C', 'Argentina', 'João Espolador', 'https://letzplay.me/JoaoEspolador'),
  ('C', 'Argentina', 'Murilo Santana Ferraro', 'https://letzplay.me/MuriloFerraro'),
  ('C', 'Argentina', 'Luan Fonseca', 'https://letzplay.me/luanfonseca1'),
  ('C', 'Noruega', 'Junior Cezar', 'https://letzplay.me/JuniorCezar2'),
  ('C', 'Noruega', 'Laís Bianca Mendes', 'https://letzplay.me/Laisbiancamendes'),
  ('C', 'Noruega', 'Daniela Lara Lara', 'https://letzplay.me/DanielaLaraLara'),
  ('C', 'Noruega', 'Natalia Garcia Suter', 'https://letzplay.me/NataliaSuter'),
  ('C', 'Noruega', 'Giselle Correia', 'https://letzplay.me/GiselleCorreia'),
  ('C', 'Noruega', 'Augusto Pelegrino', 'https://letzplay.me/AugustoPelegrino'),
  ('C', 'Noruega', 'Hugo Okuma', 'https://letzplay.me/HugoOkuma1'),
  ('C', 'Aruba', 'Alex Eiras', 'https://letzplay.me/Alexeiras1'),
  ('C', 'Aruba', 'Adriele Almeida Ribeiro', 'https://letzplay.me/AdrieleJanainadeAlmeidaRibeiro'),
  ('C', 'Aruba', 'Ana Laura', 'https://letzplay.me/AnaLauraRoberto2'),
  ('C', 'Aruba', 'Nicolas Funayama', 'https://letzplay.me/NicolasFunayama1'),
  ('C', 'Aruba', 'Marina Rodrigues', 'https://letzplay.me/MarinaRodrigues17'),
  ('C', 'Aruba', 'Pietra Vendruscolo', 'https://letzplay.me/PietraVendruscolo'),
  ('C', 'Aruba', 'Fernando Russi', 'https://letzplay.me/FernandoRussi1'),
  ('C', 'USA', 'Kauany Marchi', 'https://letzplay.me/KauanyMarchi'),
  ('C', 'USA', 'Diony Willian Mazini', 'https://letzplay.me/DionyMazini'),
  ('C', 'USA', 'Matheus Henrique Malvezzi', 'https://letzplay.me/MatheusMalvezzi'),
  ('C', 'USA', 'Debora Meretka', 'https://letzplay.me/DeboraMeretka'),
  ('C', 'USA', 'Pedro Neto', 'https://letzplay.me/PedroNeto83'),
  ('B', 'Paraguai', 'Luiz Antônio Fidelis', 'https://letzplay.me/LuizAntonioFidelis'),
  ('B', 'Paraguai', 'Ana Clara Monteiro Marchini', 'https://letzplay.me/AnaClaraMarchini1'),
  ('B', 'Paraguai', 'Gabriela Rezende', 'https://letzplay.me/GabrielaRezende12'),
  ('B', 'Paraguai', 'Joata Campetti', 'https://letzplay.me/JoataCampetti'),
  ('B', 'Paraguai', 'Arthur Mendes', 'https://letzplay.me/ArthurMendes8'),
  ('B', 'Paraguai', 'Ana Aguilar', 'https://letzplay.me/AnaAguilar'),
  ('B', 'Paraguai', 'Danilo Braga', 'https://letzplay.me/DaniloBraga1'),
  ('B', 'Cabo Verde', 'Rodrigo Vicentini', 'https://letzplay.me/RodrigoVicentini'),
  ('B', 'Cabo Verde', 'Gabriela Duarte Milani de Holanda', 'https://letzplay.me/GabrielaDuarteHolanda'),
  ('B', 'Cabo Verde', 'Jheniffer Venciguerra', 'https://letzplay.me/JhenifferVenciguerra'),
  ('B', 'Cabo Verde', 'Ryan Augusto dos Santos', 'https://letzplay.me/Ryan'),
  ('B', 'Cabo Verde', 'Wesley Crupinsqui', 'https://letzplay.me/WesleyCrupinsqui'),
  ('B', 'Portugal', 'Max Jardim', 'https://letzplay.me/MaxJardim2'),
  ('B', 'Portugal', 'Gabriel Lopes', 'https://letzplay.me/GabrielLopesbt'),
  ('B', 'Portugal', 'Rafael Camargo', 'https://letzplay.me/RafaelCamargo36'),
  ('B', 'Portugal', 'Leticia Mendonsa', 'https://letzplay.me/LeticiaMendonsa'),
  ('B', 'Portugal', 'Jenifer Matter', 'https://letzplay.me/JeniferMatter'),
  ('B', 'Portugal', 'Lorena Castagna Angelim Costa', 'https://letzplay.me/LorenaCosta17'),
  ('B', 'Brasil', 'Joao Paulo', 'https://letzplay.me/Jpsiilvaa'),
  ('B', 'Brasil', 'Taline Mangolin', 'https://letzplay.me/TalineMangolin'),
  ('B', 'Brasil', 'Lívia De Souza Cardoso', 'https://letzplay.me/LiviaCardoso12'),
  ('B', 'Brasil', 'João Victor Melo', 'https://letzplay.me/JoaoV'),
  ('B', 'Brasil', 'Lucas Mengue', 'https://letzplay.me/LucasMengue'),
  ('B', 'Argentina', 'Rafaela Lenardon', 'https://letzplay.me/RafaelaLenardon'),
  ('B', 'Argentina', 'Carolyne Balan', 'https://letzplay.me/CarolyneBalan'),
  ('B', 'Argentina', 'Vitor Zumas', 'https://letzplay.me/VitorZumas'),
  ('B', 'Argentina', 'Bicaio Bicaio', 'https://letzplay.me/bicaiio'),
  ('B', 'Argentina', 'João Gabriel Aguiar', 'https://letzplay.me/JoaoGabrielAguiar2'),
  ('B', 'Argentina', 'Gustavo Oliveira', 'https://letzplay.me/gustavooliveira211'),
  ('B', 'Noruega', 'Pedro Castro', 'https://letzplay.me/PedroCastro67'),
  ('B', 'Noruega', 'Daiana Cristian', 'https://letzplay.me/DaianaCristian'),
  ('B', 'Noruega', 'Armando Felix', 'https://letzplay.me/ArmandoFelix1'),
  ('B', 'Noruega', 'Marcio Moreto', 'https://letzplay.me/MarcioMoreto1'),
  ('B', 'Noruega', 'Josy Graca', 'https://letzplay.me/JosyGraca1'),
  ('B', 'Noruega', 'Maria Clara Lopes', 'https://letzplay.me/MariaClaraLopes14'),
  ('B', 'Noruega', 'Daiane Cristina', 'https://letzplay.me/DaianeCristina2'),
  ('B', 'Noruega', 'Thiago Garcia', 'https://letzplay.me/ThiagoGarcia07'),
  ('B', 'Aruba', 'Samuel Ribeiro', 'https://letzplay.me/SamuelRibeiro18'),
  ('B', 'Aruba', 'Daniel Souza', 'https://letzplay.me/DanielSouza54'),
  ('B', 'Aruba', 'Amabile Zolin Deantoni', 'https://letzplay.me/amabilezd'),
  ('B', 'Aruba', 'Beatriz Cazon', 'https://letzplay.me/BeatrizCazon3'),
  ('B', 'Aruba', 'Gabriela Zilioto', 'https://letzplay.me/GabrielaZiliotto3'),
  ('B', 'Aruba', 'Miguel Souza', 'https://letzplay.me/Miguelsouza33'),
  ('B', 'USA', 'Mayke Pereira Arruda', 'https://letzplay.me/MaykeArruda'),
  ('B', 'USA', 'Luiz Henrique Leandro', 'https://letzplay.me/LuizHenriqueLeandro'),
  ('B', 'USA', 'Rafael Piffer', 'https://letzplay.me/RafaelPiffer'),
  ('B', 'USA', 'Julia Mello', 'https://letzplay.me/JuliaMello11'),
  ('B', 'USA', 'Lara Laino', 'https://letzplay.me/LaraTonon'),
  ('B', 'USA', 'Sofia Asse', 'https://letzplay.me/SofiaEvangelista1'),
  ('A', 'Paraguai', 'Alberto Vinícius Rodrigues Lima', 'https://letzplay.me/AlbertoViniciusLima'),
  ('A', 'Paraguai', 'Daniel Felipe Faleiro', 'https://letzplay.me/DanielFaleiro'),
  ('A', 'Paraguai', 'Faena Gabriela Ehlers', 'https://letzplay.me/faenaehlers'),
  ('A', 'Paraguai', 'Sonyangela Imai Rossi', 'https://letzplay.me/SonyangelaRossi'),
  ('A', 'Paraguai', 'Marcela Santos', 'https://letzplay.me/Marcelasantoss'),
  ('A', 'Paraguai', 'Guilherme Valias Schmitt', 'https://letzplay.me/GuilhermeSchmitt4'),
  ('A', 'Paraguai', 'Luísa Farah', 'https://letzplay.me/luisafarahs'),
  ('A', 'Paraguai', 'Joao Caldeirao', 'https://letzplay.me/JoaoCaldeirao'),
  ('A', 'Cabo Verde', 'Ubiara Rubio Engler', 'https://letzplay.me/UbiaraEngler'),
  ('A', 'Cabo Verde', 'Luiz Petita', 'https://letzplay.me/LuizPetita'),
  ('A', 'Cabo Verde', 'Mateus Petita', 'https://letzplay.me/MateusPetita1'),
  ('A', 'Cabo Verde', 'Gabriel Rebelo', 'https://letzplay.me/GabrielRebelo'),
  ('A', 'Portugal', 'Pedro Lucas', 'https://letzplay.me/PedroGoncalves17'),
  ('A', 'Portugal', 'Bianca Mors', 'https://letzplay.me/BiancaMors'),
  ('A', 'Portugal', 'Daiane Franciele Camargo', 'https://letzplay.me/DaianeFrancieleCamargo'),
  ('A', 'Portugal', 'Filipe Gomes', 'https://letzplay.me/FilipeGomes4'),
  ('A', 'Brasil', 'Paulo Roberto', 'https://letzplay.me/PauloRobertoGermanoDosSantos'),
  ('A', 'Brasil', 'Ronnie Junior', 'https://letzplay.me/RonnieJunior1'),
  ('A', 'Brasil', 'Ana Gabriela', 'https://letzplay.me/AnaGabrielaRomao'),
  ('A', 'Brasil', 'Agar Souza', 'https://letzplay.me/AgarSouza'),
  ('A', 'Argentina', 'Manu Padilha', 'https://letzplay.me/ManuPadilha2'),
  ('A', 'Argentina', 'Antonia Thompson', 'https://letzplay.me/AntoniaThompson01'),
  ('A', 'Argentina', 'Carolina Genofre', 'https://letzplay.me/CarolinaVecchiaGenofre'),
  ('A', 'Argentina', 'Diogo Diornellas', 'https://letzplay.me/DiornellasDiogo'),
  ('A', 'Argentina', 'Leandro Proença', 'https://letzplay.me/LeandroProenca'),
  ('A', 'Noruega', 'Renata Fernandes', 'https://letzplay.me/RenataFernandes50'),
  ('A', 'Noruega', 'Ale Manzotti', 'https://letzplay.me/AleManzotti1'),
  ('A', 'Noruega', 'Giovanni Russi', 'https://letzplay.me/GiovanniRussi2'),
  ('A', 'Noruega', 'Lilian Francisco', 'https://letzplay.me/LilianFrancisco2'),
  ('A', 'Noruega', 'Evelyn Costa', 'https://letzplay.me/EvelynCosta6'),
  ('A', 'Aruba', 'Sthefani Depieri', 'https://letzplay.me/SthefaniDepieri'),
  ('A', 'Aruba', 'Gabriel Motta', 'https://letzplay.me/GabrielMotta8'),
  ('A', 'Aruba', 'Gustavo Coutto', 'https://letzplay.me/GustavoSantos99'),
  ('A', 'Aruba', 'Felipe Jardim', 'https://letzplay.me/FelipeJardim5'),
  ('A', 'Aruba', 'Lara Perez', 'https://letzplay.me/LaraPerez'),
  ('A', 'USA', 'Rafael Nadal', 'https://letzplay.me/RafaelNadal7'),
  ('A', 'USA', 'Amnon Felipe', 'https://letzplay.me/amnonpasetofelipe'),
  ('A', 'USA', 'Ana Flávia Lopes', 'https://letzplay.me/AnaLopes25'),
  ('A', 'USA', 'Amanda Mazini', 'https://letzplay.me/AmandaMazini'),
  ('A', 'USA', 'João Calado', 'https://letzplay.me/JoaoCalado3');

-- Inclui somente as pessoas que ainda nao podem ser associadas por perfil ou nome/equipe.
with new_people(team_name, athlete_name, gender) as (
  values
    ('Aruba', 'Marcos Versuti', 'Masculino'),
    ('Brasil', 'Pedro Augusto Lopes Chaves', 'Masculino'),
    ('Paraguai', 'Fernanda Lira Rodrigues Souza', 'Feminino'),
    ('Paraguai', 'Matheus Alves', 'Masculino'),
    ('Portugal', 'Fatima Santos', 'Feminino'),
    ('Portugal', 'Renan Kenzo Barreto Yamamoto', 'Masculino'),
    ('Portugal', 'Robson Willians', 'Masculino'),
    ('USA', 'Pamela Sampaio', 'Feminino')
)
insert into public.athletes (team_id, team_name, athlete_name, gender)
select t.id, p.team_name, p.athlete_name, p.gender
from new_people p
join public.teams t on t.team_name = p.team_name
where not exists (
  select 1
  from public.athletes a
  where a.team_id = t.id
    and lower(trim(a.athlete_name)) = lower(trim(p.athlete_name))
);

-- Associa por perfil existente; se for perfil novo, associa por nome dentro da equipe.
with mapped as (
  select s.*,
         t.id as team_id,
         coalesce(
           (
             select ar.athlete_id
             from public.athlete_registrations ar
             where lower(trim(ar.letzplay_profile)) = lower(trim(s.letzplay_profile))
             order by ar.created_at, ar.id
             limit 1
           ),
           (
             select a.id
             from public.athletes a
             where a.team_id = t.id
               and lower(trim(a.athlete_name)) = lower(trim(s.athlete_name))
             order by a.created_at, a.id
             limit 1
           )
         ) as athlete_id
  from sync_letzplay_source s
  join public.teams t on t.team_name = s.team_name
)
insert into public.athlete_registrations
  (athlete_id, team_id, team_name, category_name, letzplay_profile)
select athlete_id, team_id, team_name, category_name, letzplay_profile
from mapped
where athlete_id is not null
on conflict (athlete_id, category_name) do update
set team_id = excluded.team_id,
    team_name = excluded.team_name,
    letzplay_profile = excluded.letzplay_profile,
    updated_at = now();

-- Remove inscricoes que nao fazem mais parte do espelho atual do LetzPlay.
delete from public.athlete_registrations ar
where not exists (
  select 1
  from sync_letzplay_source s
  where s.category_name = ar.category_name
    and lower(trim(s.letzplay_profile)) = lower(trim(ar.letzplay_profile))
);

-- Consolida eventuais duplicidades historicas do mesmo perfil na mesma categoria.
with ranked as (
  select id,
         row_number() over (
           partition by category_name, lower(trim(letzplay_profile))
           order by created_at, id
         ) as position
  from public.athlete_registrations
)
delete from public.athlete_registrations ar
using ranked r
where ar.id = r.id
  and r.position > 1;

-- Um mesmo perfil em categorias/equipes diferentes continua sendo uma unica pessoa.
with profile_people as (
  select lower(trim(letzplay_profile)) as profile,
         athlete_id,
         min(created_at) as first_registration
  from public.athlete_registrations
  group by lower(trim(letzplay_profile)), athlete_id
), canonical as (
  select distinct on (profile)
         profile,
         athlete_id
  from profile_people
  order by profile, first_registration, athlete_id
)
update public.athlete_registrations ar
set athlete_id = c.athlete_id,
    updated_at = now()
from canonical c
where lower(trim(ar.letzplay_profile)) = c.profile
  and ar.athlete_id <> c.athlete_id;

-- Remove pessoas que ficaram sem nenhuma categoria apos a sincronizacao.
delete from public.athletes a
where not exists (
  select 1
  from public.athlete_registrations ar
  where ar.athlete_id = a.id
);
