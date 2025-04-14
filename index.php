<?php
//if (!defined('IN_INDEX')) exit();
/**
  * Zählerstand-Rechner - (mit Initialisierungs-Check)
  *
  * Dieses Skript berechnet und zeigt interpolierte Zählerstände sowie den Verbrauch 
  * basierend auf den Benutzereingaben (Datum und Zählerstände) an.
  * Unterstützt das deutsche Format TT.MM.JJJJ für Datum und 1.234,567 für Zählerstände.
  *
  * ----------------
  *
  * @author Thomas Boettcher <github[at]ztatement[dot]com>
  * @copyright (c) 2025 ztatement
  *
  * @version 1.0.0.2025.04.01
  * @link https://github.com/ztatement/ZST-Rechner
  *
  * @file $Id: index.php 1 2025-04-01T07:33:03Z ztatement $
  *
  * ----------------
  *
  * @license The MIT License (MIT)
  * @see /LICENSE
  * @see https://opensource.org/licenses/MIT Hiermit wird unentgeltlich jeder Person, die eine Kopie der Software und der zugehörigen
  *      Dokumentationen (die "Software") erhält, die Erlaubnis erteilt, sie uneingeschränkt zu nutzen,
  *      inklusive und ohne Ausnahme mit dem Recht, sie zu verwenden, zu kopieren, zu verändern,
  *      zusammenzufügen, zu veröffentlichen, zu verbreiten, zu unterlizenzieren und/oder zu verkaufen,
  *      und Personen, denen diese Software überlassen wird, diese Rechte zu verschaffen,
  *      unter den folgenden Bedingungen:
  *     
  *      Der obige Urheberrechtsvermerk und dieser Erlaubnisvermerk sind in allen Kopien
  *      oder Teilkopien der Software beizulegen.
  *     
  *      DIE SOFTWARE WIRD OHNE JEDE AUSDRÜCKLICHE ODER IMPLIZIERTE GARANTIE BEREITGESTELLT,
  *      EINSCHLIEẞLICH DER GARANTIE ZUR BENUTZUNG FÜR DEN VORGESEHENEN ODER EINEM BESTIMMTEN
  *      ZWECK SOWIE JEGLICHER RECHTSVERLETZUNG, JEDOCH NICHT DARAUF BESCHRÄNKT.
  *      IN KEINEM FALL SIND DIE AUTOREN ODER COPYRIGHTINHABER FÜR JEGLICHEN SCHADEN
  *      ODER SONSTIGE ANSPRÜCHE HAFTBAR ZU MACHEN, OB INFOLGE DER ERFÜLLUNG EINES VERTRAGES,
  *      EINES DELIKTES ODER ANDERS IM ZUSAMMENHANG MIT DER SOFTWARE
  *      ODER SONSTIGER VERWENDUNG DER SOFTWARE ENTSTANDEN.
  *      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  */


include ('schaetztabelle.html');


/**
  * Änderung:
  *
  * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ *
  * @see change.log
  *
  * $Date$ : $Revision$ - Description
  * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ *
  * Local variables:
  * tab-width: 2
  * c-basic-offset: 2
  * c-hanging-comment-ender-p: nil
  * End:
  */
