# -*- coding: utf-8 -*-
"""Szacowanie zestawu SPECIAL SET 30 szt. (Yumi Sushi Milanówek).

Liczone od dołu: każdy rodzaj sztuki rozbity na składniki o znanej gęstości
kalorycznej. Dzięki temu widać, skąd bierze się wynik, i można podważyć
pojedyncze założenie, a nie całą liczbę.

Składniki: (gramy, kcal/100 g, B/100, W/100, T/100)
"""

# gęstości kaloryczne składników
RYZ      = (150, 3.0, 33.0, 0.3)   # ryż do sushi, z octem i cukrem
LOSOS    = (200, 20.0, 0.0, 13.0)  # łosoś surowy/opalany
NORI     = (350, 40.0, 5.0, 2.0)
PHILA    = (250, 6.0, 4.0, 23.0)   # serek śmietankowy
MAJONEZ  = (600, 1.0, 2.0, 65.0)   # sosy na bazie majonezu
AWOKADO  = (160, 2.0, 2.0, 15.0)
OGOREK   = (15, 0.7, 3.0, 0.1)
KREWETKA = (240, 15.0, 15.0, 13.0)  # krewetka w tempurze, smażona
PANKO    = (380, 13.0, 70.0, 4.0)  # bułka tarta panko
OLEJ     = (900, 0.0, 0.0, 100.0)  # olej wchłonięty przy smażeniu

RODZAJE = [
    ("Nigiri z łososiem opalanym", 2, [
        ("ryż", 18, RYZ), ("łosoś", 15, LOSOS), ("sos", 3, MAJONEZ)]),
    ("Futomaki z pieczonym łososiem", 6, [
        ("ryż", 25, RYZ), ("nori", 0.5, NORI), ("łosoś", 10, LOSOS),
        ("ogórek", 5, OGOREK), ("sos", 3, MAJONEZ)]),
    ("Futomaki philadelphia z łososiem", 6, [
        ("ryż", 24, RYZ), ("nori", 0.5, NORI), ("łosoś", 8, LOSOS),
        ("philadelphia", 6, PHILA), ("ogórek", 4, OGOREK)]),
    ("California maki w tempurze z łososiem", 8, [
        ("ryż", 22, RYZ), ("nori", 0.5, NORI), ("krewetka w tempurze", 8, KREWETKA),
        ("awokado", 4, AWOKADO), ("łosoś na wierzchu", 10, LOSOS), ("sos", 4, MAJONEZ)]),
    ("Hosomaki z pastą z łososia w panko", 8, [
        ("ryż", 15, RYZ), ("nori", 0.5, NORI), ("łosoś", 6, LOSOS),
        ("majonez w paście", 2, MAJONEZ), ("panko", 4, PANKO), ("olej wchłonięty", 3, OLEJ)]),
]


def licz(skladniki):
    g = k = b = w = t = 0.0
    for _, gram, (kk, bb, ww, tt) in skladniki:
        g += gram
        k += gram * kk / 100
        b += gram * bb / 100
        w += gram * ww / 100
        t += gram * tt / 100
    return g, k, b, w, t


print("%-40s %5s %6s %6s %6s %6s" % ("rodzaj (1 sztuka)", "g", "kcal", "B", "W", "T"))
print("-" * 76)
sumy = [0.0] * 5
wpisy = []
for nazwa, ile, skl in RODZAJE:
    g, k, b, w, t = licz(skl)
    print("%-40s %5.0f %6.0f %6.1f %6.1f %6.1f" % (nazwa, g, k, b, w, t))
    for i, v in enumerate([g, k, b, w, t]):
        sumy[i] += v * ile
    # wartości na 100 g — tak trzyma je baza
    wpisy.append((nazwa, ile, round(g), round(k / g * 100), round(b / g * 100, 1),
                  round(w / g * 100, 1), round(t / g * 100, 1)))

print("-" * 76)
print("%-40s %5.0f %6.0f %6.1f %6.1f %6.1f" % ("CAŁY ZESTAW (30 szt.)", *sumy))
kontrola = sumy[2] * 4 + sumy[3] * 4 + sumy[4] * 9
print("\nkontrola 4/4/9: %.0f kcal z makro vs %.0f z rozbicia (%.1f%% różnicy)"
      % (kontrola, sumy[1], abs(kontrola - sumy[1]) / sumy[1] * 100))
print("gęstość zestawu: %.0f kcal/100 g" % (sumy[1] / sumy[0] * 100))

print("\n--- wiersze do bazy ---")
for nazwa, ile, gsz, k100, b100, w100, t100 in wpisy:
    print('["%s","gotowe",%d,%s,%s,%s,%d,"szt",%d],'
          % (nazwa, k100, b100, w100, t100, gsz * ile, gsz))
gz = round(sumy[0])
print('["Zestaw sushi 30 szt. (mieszany)","gotowe",%d,%s,%s,%s,%d,"porcja"],'
      % (round(sumy[1] / gz * 100), round(sumy[2] / gz * 100, 1),
         round(sumy[3] / gz * 100, 1), round(sumy[4] / gz * 100, 1), gz))
